import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores([
        'dist/**',
        'node_modules/**',
        'output/**',
        'playwright-report/**',
        'test-results/**',
        'server/backups/**',
        'server/*.db',
        'server/*.db-*',
        '*.log',
        'coverage/**',
        'scripts/**',
        'server/scripts/**',
        'server/check_users.js',
        'server/test_login.js',
        'check_users.js',
        'test_login.js',
    ]),
    {
        files: ['src/**/*.{js,jsx}'],
        extends: [
            js.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.browser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        rules: {
            'no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    varsIgnorePattern: '^[A-Z_]',
                },
            ],
            'react-hooks/exhaustive-deps': 'warn',
            'react-hooks/immutability': 'off',
            'react-hooks/purity': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'react-refresh/only-export-components': 'off',
        },
    },
    {
        files: [
            'server/**/*.js',
            'tests/e2e/**/*.js',
            'playwright.config.js',
        ],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: {
                ...globals.node,
            },
            parserOptions: {
                sourceType: 'commonjs',
            },
        },
        rules: {
            'no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    varsIgnorePattern: '^[A-Z_]',
                },
            ],
        },
    },
    {
        files: ['vite.config.js', 'eslint.config.js'],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: {
                ...globals.node,
            },
            parserOptions: {
                sourceType: 'module',
            },
        },
    },
]);
