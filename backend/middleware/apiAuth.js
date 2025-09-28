const ApiKey = require('../models/ApiKey');
const ipRangeCheck = require('ip-range-check');

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map();

class ApiAuthMiddleware {
    
    // Main authentication middleware
    static async authenticate(req, res, next) {
        try {
            // Only accept API key from header for security (no query parameters)
            const apiKey = req.header('X-API-Key');
            
            if (!apiKey) {
                return res.status(401).json({ 
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }
            
            // Validate API key format
            if (!apiKey.match(/^nsk_(live|test)_[a-f0-9]{64}$/)) {
                return res.status(401).json({ 
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }
            
            // Hash the API key for lookup
            const keyHash = ApiKey.hashApiKey(apiKey);
            
            // Find API key in database
            const apiKeyRecord = await ApiKey.findOne({ 
                keyHash: keyHash,
                isActive: true
            });
            
            if (!apiKeyRecord) {
                return res.status(401).json({ 
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }
            
            // Check if key has expired
            if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
                return res.status(401).json({ 
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }
            
            // Check IP whitelist
            if (apiKeyRecord.ipWhitelist.length > 0) {
                const clientIP = req.ip || req.connection.remoteAddress;
                const isWhitelisted = apiKeyRecord.ipWhitelist.some(ip => {
                    if (ip === '*') return true;
                    if (ip.includes('/')) {
                        // CIDR notation check using proper library
                        return ipRangeCheck(clientIP, ip);
                    }
                    return ip === clientIP;
                });
                
                if (!isWhitelisted) {
                    return res.status(403).json({ 
                        error: 'Forbidden',
                        message: 'Access denied'
                    });
                }
            }
            
            // Check rate limits
            const rateLimitResult = await ApiAuthMiddleware.checkRateLimit(apiKeyRecord);
            if (!rateLimitResult.allowed) {
                return res.status(429).json({ 
                    error: 'Too Many Requests',
                    message: 'Rate limit exceeded'
                });
            }
            
            // Record usage (async, don't wait)
            apiKeyRecord.recordUsage().catch(err => 
                console.error('Failed to record API key usage:', err)
            );
            
            // Attach API key info to request
            req.apiKey = apiKeyRecord;
            req.userId = apiKeyRecord.userId;
            req.userRole = apiKeyRecord.role;
            
            next();
            
        } catch (error) {
            console.error('API authentication error:', error);
            res.status(500).json({ 
                error: 'Internal Server Error',
                message: 'Authentication failed'
            });
        }
    }
    
    // Permission checking middleware factory
    static requirePermission(permission) {
        return (req, res, next) => {
            if (!req.apiKey) {
                return res.status(401).json({ 
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }
            
            if (!req.apiKey.hasPermission(permission)) {
                return res.status(403).json({ 
                    error: 'Forbidden',
                    message: 'Access denied'
                });
            }
            
            next();
        };
    }
    
    // Resource access checking middleware factory
    static requireAccess(resource, action) {
        return (req, res, next) => {
            if (!req.apiKey) {
                return res.status(401).json({ 
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }
            
            const targetUserId = req.params.userId;
            
            if (!req.apiKey.canAccess(resource, action, targetUserId)) {
                return res.status(403).json({ 
                    error: 'Forbidden',
                    message: 'Access denied'
                });
            }
            
            next();
        };
    }
    
    // Role checking middleware factory
    static requireRole(role) {
        return (req, res, next) => {
            if (!req.apiKey) {
                return res.status(401).json({ 
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }
            
            if (req.apiKey.role !== role) {
                return res.status(403).json({ 
                    error: 'Forbidden',
                    message: 'Access denied'
                });
            }
            
            next();
        };
    }
    
    // Admin access middleware
    static requireAdmin(req, res, next) {
        if (!req.apiKey) {
            return res.status(401).json({ 
                error: 'Authentication required',
                message: 'Please authenticate first'
            });
        }
        
        if (req.apiKey.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Forbidden',
                message: 'Access denied'
            });
        }
        
        next();
    }
    
    // Rate limiting check
    static async checkRateLimit(apiKeyRecord) {
        const keyId = apiKeyRecord.keyId;
        const now = Date.now();
        const minuteWindow = 60 * 1000; // 1 minute
        const hourWindow = 60 * 60 * 1000; // 1 hour
        
        // Get or create rate limit data
        if (!rateLimitStore.has(keyId)) {
            rateLimitStore.set(keyId, {
                minuteRequests: [],
                hourRequests: []
            });
        }
        
        const rateLimitData = rateLimitStore.get(keyId);
        
        // Clean old requests
        rateLimitData.minuteRequests = rateLimitData.minuteRequests.filter(
            time => now - time < minuteWindow
        );
        rateLimitData.hourRequests = rateLimitData.hourRequests.filter(
            time => now - time < hourWindow
        );
        
        // Check limits
        if (rateLimitData.minuteRequests.length >= apiKeyRecord.rateLimit.requestsPerMinute) {
            return { 
                allowed: false, 
                resetTime: Math.ceil((minuteWindow - (now - rateLimitData.minuteRequests[0])) / 1000)
            };
        }
        
        if (rateLimitData.hourRequests.length >= apiKeyRecord.rateLimit.requestsPerHour) {
            return { 
                allowed: false, 
                resetTime: Math.ceil((hourWindow - (now - rateLimitData.hourRequests[0])) / 1000)
            };
        }
        
        // Add current request
        rateLimitData.minuteRequests.push(now);
        rateLimitData.hourRequests.push(now);
        
        return { allowed: true };
    }
    
    // Optional authentication (doesn't fail if no key provided)
    static async optionalAuth(req, res, next) {
        const apiKey = req.header('X-API-Key');
        
        if (!apiKey) {
            return next(); // Continue without authentication
        }
        
        // If key is provided, authenticate it
        return ApiAuthMiddleware.authenticate(req, res, next);
    }
}

module.exports = ApiAuthMiddleware;