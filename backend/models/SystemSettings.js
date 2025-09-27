const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
    settingId: {
        type: String,
        required: true,
        unique: true,
        default: 'system_config'
    },
    firstTimeSetupCompleted: {
        type: Boolean,
        default: false
    },
    initialAdminCreated: {
        type: Boolean,
        default: false
    },
    version: {
        type: String,
        default: '1.0.0'
    },
    maintenanceMode: {
        type: Boolean,
        default: false
    },
    allowRegistration: {
        type: Boolean,
        default: true
    },
    created: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

SystemSettingsSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

SystemSettingsSchema.statics.getSystemSettings = async function() {
    let settings = await this.findOne({ settingId: 'system_config' });
    if (!settings) {
        settings = new this({});
        await settings.save();
    }
    return settings;
};

SystemSettingsSchema.statics.isFirstTimeSetup = async function() {
    const settings = await this.getSystemSettings();
    return !settings.firstTimeSetupCompleted;
};

SystemSettingsSchema.statics.markFirstTimeSetupComplete = async function() {
    const settings = await this.getSystemSettings();
    settings.firstTimeSetupCompleted = true;
    settings.initialAdminCreated = true;
    await settings.save();
    return settings;
};

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);