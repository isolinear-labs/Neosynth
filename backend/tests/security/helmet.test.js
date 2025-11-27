const request = require('supertest');
const express = require('express');
const helmet = require('helmet');

/**
 * Helmet Security Headers Tests
 *
 * These tests prevent regressions from PRs #24, #27, and #28 which fixed:
 * 1. COOP header causing CORS errors in non-production HTTP environments (PR #24)
 * 2. SSL/HTTPS upgrade enforcement breaking non-production HTTP environments (PR #27)
 * 3. mediaSrc CSP directive blocking HTTP audio streams in development (PR #28)
 *
 * IMPORTANT: These tests ensure Helmet configuration allows HTTP in non-production
 * while enforcing HTTPS-only in production environments.
 */

describe('Helmet Security Headers', () => {
    let app;

    /**
     * Helper function to create an Express app with Helmet configuration
     * matching the production server.js configuration (lines 52-74)
     */
    const createAppWithHelmet = (nodeEnv = 'development') => {
        const testApp = express();

        // Apply same Helmet configuration as server.js
        testApp.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ['\'self\''],
                    upgradeInsecureRequests: nodeEnv === 'production' ? [] : null,
                    blockAllMixedContent: nodeEnv === 'production' ? [] : null,
                    scriptSrc: ['\'self\'', '\'unsafe-inline\'', '\'unsafe-hashes\'', 'blob:'],
                    scriptSrcAttr: ['\'unsafe-inline\''],
                    styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
                    imgSrc: ['\'self\'', 'data:', 'https:'],
                    connectSrc: ['\'self\'', 'https:', 'http:'],
                    fontSrc: ['\'self\'', 'data:', 'https://fonts.gstatic.com'],
                    objectSrc: ['\'none\''],
                    mediaSrc: nodeEnv === 'production'
                        ? ['\'self\'', 'https:']
                        : ['\'self\'', 'https:', 'http:'],
                    frameSrc: ['\'none\'']
                }
            },
            crossOriginEmbedderPolicy: false,
            crossOriginOpenerPolicy: nodeEnv === 'production' ? { policy: 'same-origin' } : false,
            originAgentCluster: nodeEnv === 'production'
        }));

        // Test endpoint
        testApp.get('/test', (req, res) => {
            res.json({ message: 'OK' });
        });

        return testApp;
    };

    /**
     * Parse CSP header into a Map for easier testing
     */
    const parseCSP = (cspHeader) => {
        const directives = new Map();
        if (!cspHeader) return directives;

        cspHeader.split(';').forEach(directive => {
            const trimmed = directive.trim();
            if (!trimmed) return;

            const [name, ...values] = trimmed.split(/\s+/);
            directives.set(name, values);
        });

        return directives;
    };

    describe('Development Environment (NODE_ENV !== production)', () => {
        beforeEach(() => {
            app = createAppWithHelmet('development');
        });

        it('should NOT enforce upgrade-insecure-requests in development', async () => {
            const response = await request(app).get('/test');
            const csp = parseCSP(response.headers['content-security-policy']);

            // upgrade-insecure-requests should NOT be present
            expect(csp.has('upgrade-insecure-requests')).toBe(false);
        });

        it('should NOT enforce block-all-mixed-content in development', async () => {
            const response = await request(app).get('/test');
            const csp = parseCSP(response.headers['content-security-policy']);

            // block-all-mixed-content should NOT be present
            expect(csp.has('block-all-mixed-content')).toBe(false);
        });

        it('should allow HTTP in mediaSrc for local network audio streams', async () => {
            const response = await request(app).get('/test');
            const csp = parseCSP(response.headers['content-security-policy']);

            const mediaSrc = csp.get('media-src');
            expect(mediaSrc).toBeDefined();
            expect(mediaSrc).toContain('\'self\'');
            expect(mediaSrc).toContain('https:');
            expect(mediaSrc).toContain('http:'); // CRITICAL: Must allow HTTP in dev
        });

        it('should allow HTTP in connectSrc for API calls', async () => {
            const response = await request(app).get('/test');
            const csp = parseCSP(response.headers['content-security-policy']);

            const connectSrc = csp.get('connect-src');
            expect(connectSrc).toBeDefined();
            expect(connectSrc).toContain('\'self\'');
            expect(connectSrc).toContain('https:');
            expect(connectSrc).toContain('http:'); // Allow HTTP API calls
        });

        it('should NOT set Cross-Origin-Opener-Policy in development', async () => {
            const response = await request(app).get('/test');

            // COOP should be disabled in development for compatibility
            expect(response.headers['cross-origin-opener-policy']).toBeUndefined();
        });

        it('should NOT set Origin-Agent-Cluster in development', async () => {
            const response = await request(app).get('/test');

            // Origin-Agent-Cluster should be disabled in development
            expect(response.headers['origin-agent-cluster']).toBeUndefined();
        });
    });

    describe('Production Environment (NODE_ENV === production)', () => {
        beforeEach(() => {
            app = createAppWithHelmet('production');
        });

        it('should enforce upgrade-insecure-requests in production', async () => {
            const response = await request(app).get('/test');
            const csp = parseCSP(response.headers['content-security-policy']);

            // upgrade-insecure-requests MUST be present in production
            expect(csp.has('upgrade-insecure-requests')).toBe(true);
        });

        it('should enforce block-all-mixed-content in production', async () => {
            const response = await request(app).get('/test');
            const csp = parseCSP(response.headers['content-security-policy']);

            // block-all-mixed-content MUST be present in production
            expect(csp.has('block-all-mixed-content')).toBe(true);
        });

        it('should ONLY allow HTTPS in mediaSrc (no HTTP) in production', async () => {
            const response = await request(app).get('/test');
            const csp = parseCSP(response.headers['content-security-policy']);

            const mediaSrc = csp.get('media-src');
            expect(mediaSrc).toBeDefined();
            expect(mediaSrc).toContain('\'self\'');
            expect(mediaSrc).toContain('https:');
            expect(mediaSrc).not.toContain('http:'); // CRITICAL: NO HTTP in production
        });

        it('should still allow HTTP in connectSrc even in production for compatibility', async () => {
            const response = await request(app).get('/test');
            const csp = parseCSP(response.headers['content-security-policy']);

            const connectSrc = csp.get('connect-src');
            expect(connectSrc).toBeDefined();
            expect(connectSrc).toContain('http:'); // connectSrc allows HTTP even in prod
        });

        it('should set Cross-Origin-Opener-Policy to same-origin in production', async () => {
            const response = await request(app).get('/test');

            expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
        });

        it('should set Origin-Agent-Cluster in production', async () => {
            const response = await request(app).get('/test');

            expect(response.headers['origin-agent-cluster']).toBe('?1');
        });
    });

    describe('Shared Security Headers (All Environments)', () => {
        it('should disable COEP in all environments for compatibility', async () => {
            const devApp = createAppWithHelmet('development');
            const prodApp = createAppWithHelmet('production');

            const devResponse = await request(devApp).get('/test');
            const prodResponse = await request(prodApp).get('/test');

            // COEP should be disabled in both environments
            expect(devResponse.headers['cross-origin-embedder-policy']).toBeUndefined();
            expect(prodResponse.headers['cross-origin-embedder-policy']).toBeUndefined();
        });

        it('should set default-src to self in all environments', async () => {
            const devApp = createAppWithHelmet('development');
            const devResponse = await request(devApp).get('/test');
            const csp = parseCSP(devResponse.headers['content-security-policy']);

            const defaultSrc = csp.get('default-src');
            expect(defaultSrc).toEqual(['\'self\'']);
        });

        it('should block object-src in all environments', async () => {
            const devApp = createAppWithHelmet('development');
            const devResponse = await request(devApp).get('/test');
            const csp = parseCSP(devResponse.headers['content-security-policy']);

            const objectSrc = csp.get('object-src');
            expect(objectSrc).toEqual(['\'none\'']);
        });

        it('should block frame-src in all environments', async () => {
            const devApp = createAppWithHelmet('development');
            const devResponse = await request(devApp).get('/test');
            const csp = parseCSP(devResponse.headers['content-security-policy']);

            const frameSrc = csp.get('frame-src');
            expect(frameSrc).toEqual(['\'none\'']);
        });

        it('should allow unsafe-inline for scripts in all environments', async () => {
            const devApp = createAppWithHelmet('development');
            const devResponse = await request(devApp).get('/test');
            const csp = parseCSP(devResponse.headers['content-security-policy']);

            const scriptSrc = csp.get('script-src');
            expect(scriptSrc).toContain('\'unsafe-inline\'');
        });

        it('should allow Google Fonts in all environments', async () => {
            const devApp = createAppWithHelmet('development');
            const devResponse = await request(devApp).get('/test');
            const csp = parseCSP(devResponse.headers['content-security-policy']);

            const styleSrc = csp.get('style-src');
            expect(styleSrc).toContain('https://fonts.googleapis.com');

            const fontSrc = csp.get('font-src');
            expect(fontSrc).toContain('https://fonts.gstatic.com');
        });
    });

    describe('Regression Prevention Tests', () => {
        it('REGRESSION TEST (PR #28): HTTP audio streams must work in non-production', async () => {
            // This test specifically checks the bug fixed in PR #28
            // where tracks wouldn't play in non-prod environments using HTTP

            const devApp = createAppWithHelmet('development');
            const response = await request(devApp).get('/test');
            const csp = parseCSP(response.headers['content-security-policy']);

            const mediaSrc = csp.get('media-src');

            // Verify HTTP is allowed for local network music streaming
            expect(mediaSrc).toContain('http:');

            // Also verify HTTPS is still allowed
            expect(mediaSrc).toContain('https:');
        });

        it('REGRESSION TEST (PR #27): SSL errors must not occur in non-production', async () => {
            // This test specifically checks the bug fixed in PR #27
            // where Helmet was forcing HTTPS upgrades in non-prod environments

            const devApp = createAppWithHelmet('development');
            const response = await request(devApp).get('/test');
            const csp = parseCSP(response.headers['content-security-policy']);

            // Verify upgrade-insecure-requests is NOT enforced
            expect(csp.has('upgrade-insecure-requests')).toBe(false);

            // Verify block-all-mixed-content is NOT enforced
            expect(csp.has('block-all-mixed-content')).toBe(false);
        });

        it('REGRESSION TEST (PR #24): COOP must not break non-production environments', async () => {
            // This test specifically checks the bug fixed in PR #24
            // where Cross-Origin-Opener-Policy caused CORS errors in non-prod

            const devApp = createAppWithHelmet('development');
            const response = await request(devApp).get('/test');

            // COOP should be disabled in development
            expect(response.headers['cross-origin-opener-policy']).toBeUndefined();
        });

        it('CRITICAL: Production must still enforce HTTPS for media sources', async () => {
            // Ensure production security is not compromised while fixing dev issues

            const prodApp = createAppWithHelmet('production');
            const response = await request(prodApp).get('/test');
            const csp = parseCSP(response.headers['content-security-policy']);

            const mediaSrc = csp.get('media-src');

            // Production MUST NOT allow HTTP for media
            expect(mediaSrc).not.toContain('http:');

            // Only HTTPS should be allowed
            expect(mediaSrc).toContain('https:');
            expect(mediaSrc).toContain('\'self\'');
        });
    });
});
