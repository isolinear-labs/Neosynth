const express = require('express');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const User = require('../models/User');
const UserAuth = require('../models/UserAuth');
const UserSecurity = require('../models/UserSecurity');
const FeatureFlag = require('../models/FeatureFlag');
const SystemSettings = require('../models/SystemSettings');
const { validateUserId } = require('../middleware/validation');
const { encryptTotpSecret, decryptTotpSecret } = require('../middleware/encryption');
const SessionAuth = require('../middleware/sessionAuth');
const UnifiedAuth = require('../middleware/unifiedAuth');

// Rate limiting configurations for TOTP endpoints
const totpSetupLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 TOTP setup attempts per 15 minutes
    message: { message: 'Too fast' },
    standardHeaders: false,
    legacyHeaders: false
});

const totpVerifyLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 TOTP verification attempts per 5 minutes
    message: { message: 'Too fast' },
    standardHeaders: false,
    legacyHeaders: false
});

// Helper function to generate device token
function generateDeviceToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Helper function to generate temp code
function generateTempCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper function to parse device info
function parseDeviceInfo(userAgent) {
    const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[1] || 'Unknown';
    const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/i)?.[1] || 'Unknown';
    return `${browser} on ${os}`;
}

// Helper function to check if user has access to feature flag
function hasFeatureFlagAccess(flag, userId, userRole) {
    if (!flag.enabled) return false;
    
    // Check user-specific access
    if (flag.conditions.userIds.includes(userId)) return true;
    
    // Check role-based access
    if (flag.conditions.userRoles.includes(userRole)) return true;
    
    // Check rollout percentage
    if (flag.rolloutPercentage > 0) {
        // Simple hash-based rollout using userId
        const hash = Array.from(userId).reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        const userPercentile = Math.abs(hash) % 100;
        return userPercentile < flag.rolloutPercentage;
    }
    
    return false;
}

// Check if first-time setup is needed
router.get('/first-time-setup', async (req, res) => {
    try {
        const isFirstTimeSetup = await SystemSettings.isFirstTimeSetup();
        const userCount = await User.countDocuments();
        const adminCount = await User.countDocuments({ isAdmin: true });
        const autoAdminDisabled = process.env.DISABLE_AUTO_ADMIN === 'true';

        // Setup is required if first-time flag is true OR if no admin exists
        const requiresSetup = isFirstTimeSetup || (adminCount === 0 && !autoAdminDisabled);
        const willCreateAdmin = isFirstTimeSetup && adminCount === 0 && !autoAdminDisabled;

        res.json({
            isFirstTimeSetup,
            requiresSetup,
            userCount,
            adminCount,
            autoAdminDisabled,
            willCreateAdmin
        });
    } catch (error) {
        console.error('First-time setup check error:', error);
        res.status(500).json({ message: 'Failed to check setup status' });
    }
});

// Setup TOTP for new user registration
router.post('/setup-totp', totpSetupLimit, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        
        // Generate TOTP secret
        const secret = speakeasy.generateSecret({
            name: `NeoSynth (${username})`,
            issuer: 'NeoSynth Neural System',
            length: 32
        });
        
        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        
        res.json({
            secret: secret.base32,
            qrCodeUrl: qrCodeUrl
        });
        
    } catch (error) {
        console.error('TOTP setup error:', error);
        res.status(500).json({ message: 'Failed to setup TOTP' });
    }
});

// Verify TOTP token
router.post('/verify-totp', totpVerifyLimit, async (req, res) => {
    try {
        const { secret, token } = req.body;
        
        if (!secret || !token) {
            return res.status(400).json({ message: 'Secret and token are required' });
        }
        
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1 // Allow 30 second time drift
        });
        
        if (!verified) {
            return res.status(400).json({ message: 'Invalid TOTP token' });
        }
        
        res.json({ verified: true });
        
    } catch (error) {
        console.error('TOTP verification error:', error);
        res.status(500).json({ message: 'Failed to verify TOTP' });
    }
});

// Complete user registration
router.post('/register', async (req, res) => {
    try {
        // Security check: Block admin registration after first-time setup
        const isFirstTimeSetup = await SystemSettings.isFirstTimeSetup();
        const userCount = await User.countDocuments();
        const existingAdminCount = await User.countDocuments({ isAdmin: true });
        const autoAdminDisabled = process.env.DISABLE_AUTO_ADMIN === 'true';

        const wouldCreateAdmin = isFirstTimeSetup &&
                               existingAdminCount === 0 &&
                               !autoAdminDisabled;

        // Block admin registration attempts after first-time setup is complete
        if (!wouldCreateAdmin && !isFirstTimeSetup && userCount === 0) {
            // This would be an attempt to register as first user after setup is complete
            const userAgent = req.headers['user-agent'] || 'Unknown';
            const shortUserAgent = userAgent.length > 50 ? userAgent.substring(0, 50) + '...' : userAgent;
            console.log(`[DANGER]: A user from IP ${req.ip} and User Agent "${shortUserAgent}" has attempted to register as first user when first-time setup is already completed`);

            return res.status(403).json({ message: 'Setup is not available' });
        }

        // Drop email index if it exists (one-time fix)
        try {
            await User.collection.dropIndex('email_1');
        } catch (_e) { /* ignore if index doesn't exist */ }
        
        const { 
            username, 
            password, 
            totpSecret, 
            backupCodes, 
            deviceFingerprint, 
            deviceInfo 
        } = req.body;
        
        // Validate required fields
        if (!username || !password || !totpSecret || !backupCodes || !deviceFingerprint) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        // Generate user ID (force lowercase)
        const userId = username.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

        // Check if user already exists
        const existingUser = await User.findOne({ userId });

        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Check if this user should become admin (reuse variables from security check above)
        // const isFirstTimeSetup, userCount, existingAdminCount, autoAdminDisabled already declared above

        // Make admin if no admin exists and auto-admin is enabled
        const shouldMakeAdmin = isFirstTimeSetup &&
                              existingAdminCount === 0 &&
                              !autoAdminDisabled;
        
        // Hash password
        const saltRounds = 12;
        const salt = await bcrypt.genSalt(saltRounds);
        const passwordHash = await bcrypt.hash(password, salt);
        
        // Generate device token
        const deviceToken = generateDeviceToken();
        
        // Format backup codes
        const formattedBackupCodes = backupCodes.map(code => ({
            code: code,
            used: false,
            usedAt: null
        }));
        
        // Create user profile
        const user = new User({
            username,
            userId,
            authEnabled: true,
            isAdmin: shouldMakeAdmin // First user becomes admin automatically (if conditions met)
        });

        // Log admin assignment decision for internal system logs
        if (shouldMakeAdmin) {
            console.log(`ADMIN ASSIGNED: User '${username}' (${userId}) granted admin privileges during first-time setup`);
        } else if (isFirstTimeSetup && userCount === 0) {
            if (autoAdminDisabled) {
                console.log(`ADMIN SKIPPED: User '${username}' (${userId}) not granted admin - disabled by DISABLE_AUTO_ADMIN environment variable`);
            } else if (existingAdminCount > 0) {
                console.log(`ADMIN SKIPPED: User '${username}' (${userId}) not granted admin - ${existingAdminCount} admin(s) already exist`);
            }
        }
        
        // Create auth record
        const userAuth = new UserAuth({
            userId,
            passwordHash,
            salt,
            totpSecretEncrypted: encryptTotpSecret(totpSecret)
        });
        
        // Create security record
        const userSecurity = new UserSecurity({
            userId,
            backupCodes: formattedBackupCodes,
            trustedDevices: [{
                deviceFingerprint,
                deviceInfo: deviceInfo || parseDeviceInfo(req.headers['user-agent'] || ''),
                deviceToken,
                name: parseDeviceInfo(req.headers['user-agent'] || ''),
                lastUsed: new Date(),
                created: new Date()
            }],
            tempCodes: []
        });
        
        await user.save();
        await userAuth.save();
        await userSecurity.save();

        // Mark first-time setup as complete if this was the first user and they became admin
        if (shouldMakeAdmin) {
            await SystemSettings.markFirstTimeSetupComplete();
            // Update in-memory flag for efficient future checks
            if (global.markSetupComplete) {
                global.markSetupComplete();
            }
            console.log(`First-time setup completed. User '${username}' created as initial admin.`);
        } else if (isFirstTimeSetup && userCount === 0) {
            // First user created but didn't become admin (either disabled by env var or admin already exists)
            await SystemSettings.markFirstTimeSetupComplete();
            // Update in-memory flag for efficient future checks
            if (global.markSetupComplete) {
                global.markSetupComplete();
            }
            console.log(`First-time setup completed. User '${username}' created (auto-admin ${autoAdminDisabled ? 'disabled by environment variable' : 'skipped due to existing admin'}).`);
        }
        
        // Create session token for new user
        const sessionDeviceInfo = {
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            platform: deviceInfo || parseDeviceInfo(req.headers['user-agent'] || '')
        };
        
        const sessionData = await SessionAuth.createSession(user.userId, user.isAdmin, sessionDeviceInfo);
        
        // Set secure session cookie
        SessionAuth.setSessionCookie(res, sessionData.sessionToken, sessionData.expiresAt);
        
        res.status(201).json({
            message: 'User registered successfully',
            userId: user.userId,
            deviceToken: deviceToken,
            sessionToken: sessionData.sessionToken,
            expiresAt: sessionData.expiresAt
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.code === 11000) {
            // Duplicate key error - only username should be unique now
            return res.status(400).json({ message: 'Username already exists' });
        }
        
        res.status(500).json({ message: 'Registration failed' });
    }
});

// Step 1: Password verification (returns temporary session for 2FA)
router.post('/auth-step1', async (req, res) => {
    try {
        const { username, password, deviceFingerprint } = req.body;

        // Basic validation
        if (!username || !password || !deviceFingerprint) {
            return res.status(400).json({
                message: 'Username, password, and device fingerprint are required'
            });
        }

        // Find user
        const user = await User.findOne({ userId: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Get auth and security data
        const userAuth = await UserAuth.findOne({ userId: user.userId });
        const userSecurity = await UserSecurity.findOne({ userId: user.userId });

        if (!userAuth) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const passwordValid = await bcrypt.compare(password, userAuth.passwordHash);
        if (!passwordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if device is trusted
        const trustedDevice = userSecurity?.trustedDevices.find(
            device => device.deviceFingerprint === deviceFingerprint
        );

        if (trustedDevice) {
            // Trusted device - complete login immediately
            await user.save();

            const deviceInfo = {
                userAgent: req.headers['user-agent'],
                ip: req.ip,
                platform: parseDeviceInfo(req.headers['user-agent'] || '')
            };

            const sessionData = await SessionAuth.createSession(user.userId, user.isAdmin, deviceInfo);
            SessionAuth.setSessionCookie(res, sessionData.sessionToken, sessionData.expiresAt);

            console.log(`User ${user.userId} logged in via trusted device`);

            return res.json({
                success: true,
                message: 'Login successful',
                requiresStep2: false,
                user: {
                    userId: user.userId,
                    username: user.username,
                    isAdmin: user.isAdmin
                }
            });
        }

        // Device not trusted - require 2FA
        // Generate temporary step token
        const stepToken = crypto.randomBytes(32).toString('hex');
        const stepExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Store step1 data temporarily
        // For now, we'll store in memory - TODO: move to Redis
        if (!global.authStepTokens) global.authStepTokens = new Map();
        global.authStepTokens.set(stepToken, {
            userId: user.userId,
            deviceFingerprint,
            expiresAt: stepExpiry,
            isAdmin: user.isAdmin
        });

        // Cleanup expired tokens
        for (const [token, data] of global.authStepTokens.entries()) {
            if (data.expiresAt < new Date()) {
                global.authStepTokens.delete(token);
            }
        }

        // Determine available 2FA methods
        const availableMethods = [];
        if (userAuth.totpSecretEncrypted) availableMethods.push('totp');
        if (userSecurity?.backupCodes?.some(bc => !bc.used)) availableMethods.push('backup');
        if (userSecurity?.tempCodes?.some(tc => !tc.used)) availableMethods.push('tempCode');

        res.json({
            success: true,
            message: 'Password verified, 2FA required',
            requiresStep2: true,
            stepToken,
            availableMethods,
            expiresIn: 300 // 5 minutes
        });

    } catch (error) {
        console.error('Auth step 1 error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Step 2: 2FA verification (completes login using step token)
router.post('/auth-step2', async (req, res) => {
    try {
        const { stepToken, totpToken, backupCode, tempCode } = req.body;

        // Validate step token
        if (!stepToken) {
            return res.status(400).json({ message: 'Step token is required' });
        }

        if (!global.authStepTokens) global.authStepTokens = new Map();
        const stepData = global.authStepTokens.get(stepToken);

        if (!stepData) {
            return res.status(401).json({ message: 'Invalid or expired step token' });
        }

        if (stepData.expiresAt < new Date()) {
            global.authStepTokens.delete(stepToken);
            return res.status(401).json({ message: 'Step token expired' });
        }

        // Validate 2FA method provided
        if (!totpToken && !backupCode && !tempCode) {
            return res.status(400).json({ message: '2FA method required' });
        }

        // Get user data
        const user = await User.findOne({ userId: stepData.userId });
        const userAuth = await UserAuth.findOne({ userId: stepData.userId });
        const userSecurity = await UserSecurity.findOne({ userId: stepData.userId });

        if (!user || !userAuth) {
            global.authStepTokens.delete(stepToken);
            return res.status(401).json({ message: 'Invalid authentication state' });
        }

        let authMethod = null;
        let authValid = false;

        // Verify TOTP token
        if (totpToken && userAuth.totpSecretEncrypted) {
            const totpSecret = decryptTotpSecret(userAuth.totpSecretEncrypted);
            const verified = speakeasy.totp.verify({
                secret: totpSecret,
                encoding: 'base32',
                token: totpToken,
                window: 1
            });

            if (verified) {
                authMethod = 'totp';
                authValid = true;
            }
        }

        // Verify backup code
        else if (backupCode && userSecurity) {
            const validBackupCode = userSecurity.backupCodes.find(
                bc => bc.code === backupCode && !bc.used
            );

            if (validBackupCode) {
                validBackupCode.used = true;
                validBackupCode.usedAt = new Date();
                await userSecurity.save();
                authMethod = 'backupCode';
                authValid = true;
            }
        }

        // Verify temp code
        else if (tempCode && userSecurity) {
            const validTempCode = userSecurity.tempCodes.find(
                tc => tc.code === tempCode && !tc.used
            );

            if (validTempCode) {
                validTempCode.used = true;
                await userSecurity.save();
                authMethod = 'tempCode';
                authValid = true;
            }
        }

        if (!authValid) {
            return res.status(401).json({
                message: 'Invalid 2FA code',
                stepToken // Allow retry with same step token
            });
        }

        // 2FA successful - complete login
        global.authStepTokens.delete(stepToken); // Clean up step token

        // Update last login
        user.lastLogin = new Date();

        // Add device as trusted if 2FA was successful
        let deviceToken = null;
        if (userSecurity) {
            deviceToken = generateDeviceToken();
            userSecurity.trustedDevices.push({
                deviceFingerprint: stepData.deviceFingerprint,
                deviceInfo: parseDeviceInfo(req.headers['user-agent'] || ''),
                deviceToken,
                name: parseDeviceInfo(req.headers['user-agent'] || ''),
                lastUsed: new Date(),
                created: new Date()
            });
            await userSecurity.save();
        }

        await user.save();

        // Create session
        const deviceInfo = {
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            platform: parseDeviceInfo(req.headers['user-agent'] || '')
        };

        const sessionData = await SessionAuth.createSession(user.userId, user.isAdmin, deviceInfo);
        SessionAuth.setSessionCookie(res, sessionData.sessionToken, sessionData.expiresAt);

        console.log(`User ${user.userId} completed 2FA login via ${authMethod}`);

        res.json({
            success: true,
            message: 'Login successful',
            authMethod,
            user: {
                userId: user.userId,
                username: user.username,
                isAdmin: user.isAdmin
            },
            deviceToken
        });

    } catch (error) {
        console.error('Auth step 2 error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Generate temp code for device authorization
router.post('/generate-temp-code', async (req, res) => {
    try {
        const { userId, deviceToken } = req.body;
        
        if (!userId || !deviceToken) {
            return res.status(400).json({ message: 'User ID and device token are required' });
        }
        
        // Find user and verify device
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const userSecurity = await UserSecurity.findOne({ userId });
        if (!userSecurity) {
            return res.status(404).json({ message: 'User security data not found' });
        }
        
        const trustedDevice = userSecurity.trustedDevices.find(
            device => device.deviceToken === deviceToken
        );
        
        if (!trustedDevice) {
            return res.status(401).json({ message: 'Device not trusted' });
        }
        
        // Generate temp code
        const tempCode = generateTempCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        // Add temp code to user
        userSecurity.tempCodes.push({
            code: tempCode,
            expiresAt: expiresAt,
            used: false
        });
        
        // Clean up expired temp codes
        userSecurity.tempCodes = userSecurity.tempCodes.filter(
            tc => !tc.used && tc.expiresAt > new Date()
        );
        
        await userSecurity.save();
        
        res.json({
            tempCode: tempCode,
            expiresAt: expiresAt
        });
        
    } catch (error) {
        console.error('Temp code generation error:', error);
        res.status(500).json({ message: 'Failed to generate temp code' });
    }
});

// Get user's trusted devices
router.get('/devices/:userId', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId, 
    async (req, res) => {
        try {
            const user = await User.findOne({ userId: req.params.userId });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
        
            const userSecurity = await UserSecurity.findOne({ userId: req.params.userId });
            if (!userSecurity) {
                return res.status(404).json({ message: 'User security data not found' });
            }
        
            const devices = userSecurity.trustedDevices.map(device => ({
                fingerprint: device.deviceFingerprint,
                name: device.name,
                deviceInfo: device.deviceInfo,
                lastUsed: device.lastUsed,
                created: device.created
            }));
        
            res.json({ devices });
        
        } catch (error) {
            console.error('Devices fetch error:', error);
            res.status(500).json({ message: 'Failed to fetch devices' });
        }
    });

// Remove trusted device
router.delete('/devices/:userId/:fingerprint', 
    UnifiedAuth.authenticate,
    UnifiedAuth.requireOwnership('userId'),
    validateUserId, 
    async (req, res) => {
        try {
            const { userId, fingerprint } = req.params;
        
            const user = await User.findOne({ userId });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
        
            const userSecurity = await UserSecurity.findOne({ userId });
            if (!userSecurity) {
                return res.status(404).json({ message: 'User security data not found' });
            }
        
            userSecurity.trustedDevices = userSecurity.trustedDevices.filter(
                device => device.deviceFingerprint !== fingerprint
            );
        
            await userSecurity.save();
        
            res.json({ message: 'Device removed successfully' });
        
        } catch (error) {
            console.error('Device removal error:', error);
            res.status(500).json({ message: 'Failed to remove device' });
        }
    });

// Logout - revoke session and clear cookie
router.post('/logout', SessionAuth.authenticate, async (req, res) => {
    try {
        // Revoke the current session
        await SessionAuth.revokeSession(req.session.sessionToken);
        
        // Clear the session cookie
        SessionAuth.clearSessionCookie(res);
        
        res.json({ message: 'Logout successful' });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Logout failed' });
    }
});

// Check session status and handle daily extensions - for app initialization  
router.get('/session-status', async (req, res) => {
    try {
        // Get session token before authentication middleware updates lastActive
        const sessionToken = req.signedCookies?.sessionToken ||
                            req.cookies?.sessionToken || 
                            req.headers['x-session-token'] || 
                            req.headers['authorization']?.replace('Bearer ', '');

        if (!sessionToken) {
            return res.status(401).json({ 
                message: 'Unauthorized',
                code: 'AUTH_REQUIRED'
            });
        }

        // Find session in database with original lastActive timestamp
        const session = await require('../models/UserSession').findOne({ 
            sessionToken,
            isActive: true 
        });

        if (!session) {
            return res.status(401).json({ 
                message: 'Unauthorized',
                code: 'AUTH_INVALID'
            });
        }

        // Check if session is expired
        const isValidSession = session.isValid();
        
        if (!isValidSession) {
            // Mark session as inactive
            session.isActive = false;
            await session.save();
            
            return res.status(401).json({ 
                message: 'Unauthorized',
                code: 'AUTH_EXPIRED'
            });
        }

        // Update last active time
        await session.updateActivity();
        
        // Return session status
        res.json({
            status: 'valid',
            userId: session.userId,
            isAdmin: session.isAdmin
        });
        
    } catch (error) {
        console.error('Session status error:', error);
        res.status(500).json({ message: 'Failed to check session status' });
    }
});


// Get session info - for session expiration warnings
router.get('/session-info', SessionAuth.authenticate, async (req, res) => {
    try {
        const now = new Date();
        const expiresAt = req.session.expiresAt;
        const timeRemaining = expiresAt - now;
        const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        res.json({
            expiresAt: expiresAt,
            timeRemaining: timeRemaining,
            hoursRemaining: hoursRemaining,
            minutesRemaining: minutesRemaining,
            isExpiringSoon: timeRemaining < (60 * 60 * 1000), // Less than 1 hour
            deviceInfo: req.session.deviceInfo
        });
        
    } catch (error) {
        console.error('Session info error:', error);
        res.status(500).json({ message: 'Failed to get session info' });
    }
});

// Password reset (session token only - no API key access)
router.post('/reset-password', SessionAuth.authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.userId; // From session authentication

        // Validate required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: 'Current password and new password are required'
            });
        }

        // Validate new password strength
        if (newPassword.length < 8) {
            return res.status(400).json({
                message: 'New password must be at least 8 characters long'
            });
        }

        // Get user data
        const user = await User.findOne({ userId });
        const userAuth = await UserAuth.findOne({ userId });

        if (!user || !userAuth) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const passwordValid = await bcrypt.compare(currentPassword, userAuth.passwordHash);
        if (!passwordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Generate new password hash
        const saltRounds = 12;
        const salt = await bcrypt.genSalt(saltRounds);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Update password in database
        userAuth.passwordHash = newPasswordHash;
        userAuth.salt = salt;
        userAuth.lastPasswordChange = new Date();
        await userAuth.save();

        console.log(`Password reset successful for user: ${userId}`);

        res.json({
            message: 'Password reset successful'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Password reset failed' });
    }
});

module.exports = router;