const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Joi = require('joi');

const clientLogLimit = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 30,
    message: { message: 'Too many log requests' },
    standardHeaders: true,
    legacyHeaders: false
});

const ALLOWED_EVENTS = [
    'page_freeze',
    'page_hide',
    'audio_interrupted',
    'audio_context_state_change',
    'playback_error'
];

const clientLogSchema = Joi.object({
    event: Joi.string().valid(...ALLOWED_EVENTS).required(),
    timestamp: Joi.string().isoDate().required(),
    platform: Joi.object({
        userAgent: Joi.string().max(500).required(),
        isIOS: Joi.boolean().required(),
        isPWA: Joi.boolean().required(),
        iosVersion: Joi.string().max(20).allow(null).optional()
    }).required(),
    playback: Joi.object({
        isPlaying: Joi.boolean().required(),
        currentTime: Joi.number().allow(null).optional(),
        duration: Joi.number().allow(null).optional(),
        track: Joi.string().max(500).allow(null).optional()
    }).optional(),
    audioContextState: Joi.string().max(50).optional(),
    source: Joi.string().max(100).optional(),
    persisted: Joi.boolean().optional(),
    errCode: Joi.number().integer().min(1).max(4).allow(null).optional(),
    errName: Joi.string().max(50).optional(),
    errMessage: Joi.string().max(500).allow(null).optional(),
    failedUrl: Joi.string().max(1000).allow(null).optional()
});

router.post('/client-log', clientLogLimit, (req, res) => {
    const { error, value } = clientLogSchema.validate(req.body, { stripUnknown: true });
    if (error) {
        return res.status(400).json({ message: 'Invalid log payload' });
    }

    const { event, timestamp, platform, playback, audioContextState, source, errCode, errName, errMessage, failedUrl } = value;

    const parts = [
        '[CLIENT-LOG]',
        `event=${event}`,
        `ts=${timestamp}`,
        `ios=${platform.isIOS}`,
        `pwa=${platform.isPWA}`
    ];

    if (platform.iosVersion) parts.push(`ios_ver=${platform.iosVersion}`);
    if (playback) {
        parts.push(`playing=${playback.isPlaying}`);
        if (playback.currentTime != null) parts.push(`pos=${Math.round(playback.currentTime)}s`);
        if (playback.track) parts.push(`track=${playback.track}`);
    }
    if (audioContextState) parts.push(`ctx=${audioContextState}`);
    if (source) parts.push(`src=${source}`);
    if (errCode != null) parts.push(`err_code=${errCode}`);
    if (errName) parts.push(`err_name=${errName}`);
    if (errMessage) parts.push(`err_msg=${errMessage}`);
    if (failedUrl) parts.push(`failed_url=${failedUrl}`);

    console.log(parts.join(' | '));

    res.status(204).end();
});

module.exports = router;
