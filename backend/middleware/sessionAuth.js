const UserSession = require('../models/UserSession');

class SessionAuth {
    
    // Middleware to authenticate session tokens
    static async authenticate(req, res, next) {
        try {
            // Simple debug logging check - just check if flag exists and is enabled
            let debugAuthLogging = false;
            try {
                const FeatureFlag = require('../models/FeatureFlag');
                const flag = await FeatureFlag.findOne({ 
                    name: 'debug_authentication_logging',
                    enabled: true 
                });
                debugAuthLogging = flag && flag.enabled;
            } catch (_flagError) {
                // Ignore feature flag errors
            }
            
            // Get session token from secure cookie, with fallback to headers for API compatibility
            const sessionToken = req.signedCookies?.sessionToken ||
                                req.cookies?.sessionToken || 
                                req.headers['x-session-token'] || 
                                req.headers['authorization']?.replace('Bearer ', '');

            if (debugAuthLogging && !sessionToken) {
                console.log('==== SESSION AUTH DEBUG ====');
                console.log('🔑 [AUTH-DEBUG] No session token found for', req.path);
                console.log('🔑 [AUTH-DEBUG] signedCookies:', req.signedCookies?.sessionToken ? 'Present' : 'Missing');
                console.log('=============================');
            }

            if (!sessionToken) {
                return res.status(401).json({ 
                    message: 'Unauthorized',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Find session in database
            const session = await UserSession.findOne({ 
                sessionToken,
                isActive: true 
            });

            if (debugAuthLogging && !session) {
                console.log('==== SESSION AUTH DEBUG ====');
                console.log('🔑 [AUTH-DEBUG] Session not found in DB for token:', sessionToken ? `${sessionToken.substring(0, 20)}...` : 'None');
                console.log('=============================');
            }

            if (!session) {
                return res.status(401).json({ 
                    message: 'Unauthorized',
                    code: 'AUTH_INVALID'
                });
            }

            // Check if session is expired
            const isValidSession = session.isValid();
            
            if (!isValidSession) {
                if (debugAuthLogging) {
                    console.log('==== SESSION AUTH DEBUG ====');
                    console.log('🔑 [AUTH-DEBUG] Session expired for', session.userId, 'expires:', session.expiresAt);
                    console.log('=============================');
                }
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

            // Attach session and user info to request
            req.session = session;
            req.userId = session.userId;
            req.isAdmin = session.isAdmin;

            next();
        } catch (error) {
            console.error('Session authentication error:', error);
            // Skip feature flag check in error handler to avoid additional complexity
            return res.status(500).json({ 
                message: 'Internal Server Error',
                code: 'AUTH_ERROR'
            });
        }
    }

    // Middleware to require admin privileges
    static requireAdmin(req, res, next) {
        if (!req.session || !req.isAdmin) {
            return res.status(403).json({ 
                message: 'Forbidden',
                code: 'ADMIN_REQUIRED'
            });
        }
        next();
    }

    // Middleware to validate user can access their own resources
    static requireOwnership(userIdParam = 'userId') {
        return (req, res, next) => {
            const requestedUserId = req.params[userIdParam];
            
            // Admin can access any user's resources
            if (req.isAdmin) {
                return next();
            }
            
            // User can only access their own resources
            if (req.userId !== requestedUserId) {
                return res.status(403).json({ 
                    message: 'Forbidden',
                    code: 'ACCESS_DENIED'
                });
            }
            
            next();
        };
    }

    // Optional authentication - doesn't fail if no token provided
    static async optionalAuth(req, res, next) {
        const sessionToken = req.signedCookies?.sessionToken ||
                           req.cookies?.sessionToken || 
                           req.headers['x-session-token'] || 
                           req.headers['authorization']?.replace('Bearer ', '');

        if (!sessionToken) {
            return next(); // Continue without authentication
        }

        try {
            const session = await UserSession.findOne({ 
                sessionToken,
                isActive: true 
            });

            if (session && session.isValid()) {
                await session.updateActivity();
                req.session = session;
                req.userId = session.userId;
                req.isAdmin = session.isAdmin;
            }
        } catch (error) {
            console.error('Optional session auth error:', error);
            // Continue without authentication on error
        }

        next();
    }

    // Utility method to create session for login
    static async createSession(userId, isAdmin = false, deviceInfo = {}) {
        try {
            // Cleanup old expired sessions for this user
            await UserSession.deleteMany({
                userId,
                $or: [
                    { expiresAt: { $lt: new Date() } },
                    { isActive: false }
                ]
            });

            // Create new session
            const session = UserSession.createSession(userId, isAdmin, deviceInfo);
            await session.save();

            return {
                sessionToken: session.sessionToken,
                expiresAt: session.expiresAt,
                userId: session.userId
            };
        } catch (error) {
            console.error('Error creating session:', error);
            throw new Error('Failed to create session');
        }
    }

    // Utility method to set secure session cookie
    static setSessionCookie(res, sessionToken, expiresAt) {
        const isProduction = process.env.NODE_ENV === 'production';
        
        res.cookie('sessionToken', sessionToken, {
            httpOnly: true,        // Prevent XSS attacks
            secure: isProduction,  // HTTPS only in production
            sameSite: 'lax',       // Allow cross-site navigation while maintaining CSRF protection
            expires: expiresAt,    // Match session expiration
            path: '/',             // Available site-wide
            signed: true           // Prevent tampering
        });
    }

    // Utility method to clear session cookie
    static clearSessionCookie(res) {
        res.clearCookie('sessionToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            signed: true
        });
    }

    // Utility method to revoke session
    static async revokeSession(sessionToken) {
        try {
            const session = await UserSession.findOne({ sessionToken });
            if (session) {
                session.isActive = false;
                await session.save();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error revoking session:', error);
            throw new Error('Failed to revoke session');
        }
    }
}

module.exports = SessionAuth;