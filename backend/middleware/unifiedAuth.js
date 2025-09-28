const ApiAuth = require('./apiAuth');
const SessionAuth = require('./sessionAuth');

class UnifiedAuth {
    // Middleware that accepts either session cookies OR API keys
    static async authenticate(req, res, next) {
        try {
            // 1. First try session authentication (for web dashboard)
            const sessionToken = req.signedCookies?.sessionToken ||
                               req.cookies?.sessionToken ||
                               req.headers['x-session-token'] ||
                               req.headers['authorization']?.replace('Bearer ', '');

            if (sessionToken) {
                // Intercept the response to catch session auth failures
                const originalSend = res.send;
                const originalJson = res.json;
                let sessionAuthFailed = false;

                res.send = function(_data) {
                    sessionAuthFailed = true;
                    res.send = originalSend;
                    res.json = originalJson;
                    // Don't send the response yet - try API key auth
                    UnifiedAuth.tryApiKeyAuth(req, res, next);
                };

                res.json = function(_data) {
                    sessionAuthFailed = true;
                    res.send = originalSend;
                    res.json = originalJson;
                    // Don't send the response yet - try API key auth
                    UnifiedAuth.tryApiKeyAuth(req, res, next);
                };

                await SessionAuth.authenticate(req, res, () => {
                    if (!sessionAuthFailed) {
                        // Restore original methods
                        res.send = originalSend;
                        res.json = originalJson;
                        req.authType = 'session';
                        next();
                    }
                });

                return;
            }

            // 2. No session token, try API key authentication
            return UnifiedAuth.tryApiKeyAuth(req, res, next);

        } catch (error) {
            console.error('Unified authentication error:', error);
            return res.status(500).json({ 
                message: 'Internal Server Error',
                code: 'AUTH_ERROR'
            });
        }
    }

    // Helper method to try API key authentication
    static tryApiKeyAuth(req, res, next) {
        ApiAuth.authenticate(req, res, (err) => {
            if (err) {
                // Both auth methods failed
                return res.status(401).json({ 
                    message: 'Unauthorized',
                    code: 'AUTH_REQUIRED'
                });
            } else {
                req.authType = 'apikey';
                next();
            }
        });
    }

    // Middleware to require admin privileges (works with both auth types)
    static requireAdmin(req, res, next) {
        const isAdmin = req.authType === 'session' ? req.isAdmin : req.apiKey?.role === 'admin';
        
        if (!isAdmin) {
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
            const currentUserId = req.authType === 'session' ? req.userId : req.apiKey?.userId;
            const isAdmin = req.authType === 'session' ? req.isAdmin : req.apiKey?.role === 'admin';
            
            // Admin can access any user's resources
            if (isAdmin) {
                return next();
            }
            
            // User can only access their own resources
            if (currentUserId !== requestedUserId) {
                return res.status(403).json({ 
                    message: 'Forbidden',
                    code: 'ACCESS_DENIED'
                });
            }
            
            next();
        };
    }
}

module.exports = UnifiedAuth;