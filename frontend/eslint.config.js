module.exports = [
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                alert: 'readonly',
                confirm: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                // Web APIs
                FormData: 'readonly',
                Event: 'readonly',
                EventSource: 'readonly',
                AudioContext: 'readonly',
                webkitAudioContext: 'readonly',
                MediaMetadata: 'readonly',
                DOMParser: 'readonly',
                AbortController: 'readonly',
                screen: 'readonly',
                arguments: 'readonly',
                module: 'readonly',
                require: 'readonly',
                global: 'readonly',
                Blob: 'readonly'
            }
        },
        rules: {
            // Code style
            'indent': ['error', 4],
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            'comma-dangle': ['error', 'never'],
            
            // Best practices
            'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_', 'caughtErrorsIgnorePattern': '^_' }],
            'no-console': 'off',
            'prefer-const': 'error',
            'no-var': 'error',
            
            // Error prevention
            'no-undef': 'error',
            'no-unreachable': 'error',
            'no-duplicate-imports': 'error'
        }
    },
    {
        files: ['tests/**/*.js', '**/*.test.js'],
        languageOptions: {
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                alert: 'readonly',
                confirm: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                FormData: 'readonly',
                Event: 'readonly',
                EventSource: 'readonly',
                AudioContext: 'readonly',
                webkitAudioContext: 'readonly',
                MediaMetadata: 'readonly',
                DOMParser: 'readonly',
                AbortController: 'readonly',
                screen: 'readonly',
                arguments: 'readonly',
                module: 'readonly',
                require: 'readonly',
                global: 'readonly',
                Blob: 'readonly',
                // Jest globals
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                jest: 'readonly'
            }
        }
    },
    {
        files: ['sw.js'],
        languageOptions: {
            globals: {
                // Service Worker globals
                self: 'readonly',
                clients: 'readonly',
                caches: 'readonly',
                importScripts: 'readonly',
                skipWaiting: 'readonly',
                addEventListener: 'readonly',
                fetch: 'readonly',
                Response: 'readonly',
                Request: 'readonly',
                URL: 'readonly'
            }
        }
    },
    {
        ignores: ['node_modules/**', 'cssCustom/**']
    }
];