const SessionAuth = require('../../middleware/sessionAuth');

// Mock response object
const mockResponse = () => {
    const res = {};
    res.cookie = jest.fn();
    res.clearCookie = jest.fn();
    return res;
};

describe('SessionAuth Cookie Configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('setSessionCookie', () => {
        it('should set secure cookie in production by default', () => {
            process.env.NODE_ENV = 'production';
            delete process.env.FORCE_SECURE_COOKIES;

            const res = mockResponse();
            const sessionToken = 'test-token';
            const expiresAt = new Date();

            SessionAuth.setSessionCookie(res, sessionToken, expiresAt);

            expect(res.cookie).toHaveBeenCalledWith('sessionToken', sessionToken, {
                httpOnly: true,
                secure: true, // Should be true in production by default
                sameSite: 'lax',
                expires: expiresAt,
                path: '/',
                signed: true
            });
        });

        it('should not set secure cookie in development', () => {
            process.env.NODE_ENV = 'development';
            delete process.env.FORCE_SECURE_COOKIES;

            const res = mockResponse();
            const sessionToken = 'test-token';
            const expiresAt = new Date();

            SessionAuth.setSessionCookie(res, sessionToken, expiresAt);

            expect(res.cookie).toHaveBeenCalledWith('sessionToken', sessionToken, {
                httpOnly: true,
                secure: false, // Should be false in development
                sameSite: 'lax',
                expires: expiresAt,
                path: '/',
                signed: true
            });
        });

        it('should allow disabling secure cookies in production with FORCE_SECURE_COOKIES=false', () => {
            process.env.NODE_ENV = 'production';
            process.env.FORCE_SECURE_COOKIES = 'false';

            const res = mockResponse();
            const sessionToken = 'test-token';
            const expiresAt = new Date();

            SessionAuth.setSessionCookie(res, sessionToken, expiresAt);

            expect(res.cookie).toHaveBeenCalledWith('sessionToken', sessionToken, {
                httpOnly: true,
                secure: false, // Should be false when explicitly disabled
                sameSite: 'lax',
                expires: expiresAt,
                path: '/',
                signed: true
            });
        });

        it('should set secure cookie when FORCE_SECURE_COOKIES=true', () => {
            process.env.NODE_ENV = 'production';
            process.env.FORCE_SECURE_COOKIES = 'true';

            const res = mockResponse();
            const sessionToken = 'test-token';
            const expiresAt = new Date();

            SessionAuth.setSessionCookie(res, sessionToken, expiresAt);

            expect(res.cookie).toHaveBeenCalledWith('sessionToken', sessionToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                expires: expiresAt,
                path: '/',
                signed: true
            });
        });
    });

    describe('clearSessionCookie', () => {
        it('should use secure flag in production by default', () => {
            process.env.NODE_ENV = 'production';
            delete process.env.FORCE_SECURE_COOKIES;

            const res = mockResponse();

            SessionAuth.clearSessionCookie(res);

            expect(res.clearCookie).toHaveBeenCalledWith('sessionToken', {
                httpOnly: true,
                secure: true, // Should be true in production by default
                sameSite: 'strict',
                path: '/',
                signed: true
            });
        });

        it('should not use secure flag in development', () => {
            process.env.NODE_ENV = 'development';
            delete process.env.FORCE_SECURE_COOKIES;

            const res = mockResponse();

            SessionAuth.clearSessionCookie(res);

            expect(res.clearCookie).toHaveBeenCalledWith('sessionToken', {
                httpOnly: true,
                secure: false, // Should be false in development
                sameSite: 'strict',
                path: '/',
                signed: true
            });
        });

        it('should allow disabling secure flag with FORCE_SECURE_COOKIES=false', () => {
            process.env.NODE_ENV = 'production';
            process.env.FORCE_SECURE_COOKIES = 'false';

            const res = mockResponse();

            SessionAuth.clearSessionCookie(res);

            expect(res.clearCookie).toHaveBeenCalledWith('sessionToken', {
                httpOnly: true,
                secure: false, // Should be false when explicitly disabled
                sameSite: 'strict',
                path: '/',
                signed: true
            });
        });
    });
});
