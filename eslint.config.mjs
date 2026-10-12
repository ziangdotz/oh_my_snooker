import js from '@eslint/js';
import runtimeCatalog from './src/runtime/runtime-catalog.json' with { type: 'json' };

const maintainedFiles = [
  'config/**/*.mjs',
  'scripts/**/*.mjs',
  'tooling/**/*.mjs',
  'src/**/*.js',
  'src/*.mjs',
  'tests/**/*.mjs',
  '*.config.mjs',
];

export default [
  {
    ignores: [
      'baselines/**',
      // Preserved third-party snapshots only; new files receive normal lint rules.
      'src/third-party/browser/browser-detector.js',
      'src/third-party/browser/webgl-detector.js',
      'src/third-party/rendering/babylon-engine.js',
      'build/**',
      'dist/**',
      'artifacts/**',
      'reports/**',
      '.cache/**',
      '.npm/**',
      'node_modules/**',
    ],
  },
  {
    files: maintainedFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        fetch: 'readonly',
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': [
        'error',
        { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-throw-literal': 'error',
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        performance: 'readonly',
        XMLHttpRequest: 'readonly',
        Image: 'readonly',
        clearTimeout: 'readonly',
        Modernizr: 'readonly',
        process: 'off',
        Buffer: 'off',
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['node:*', '**/tooling/**', '**/scripts/**'] },
      ],
    },
  },
  {
    files: ['src/compatibility/browser.js'],
    languageOptions: { sourceType: 'script' },
  },
  {
    files: ['src/domain/**/*.js', 'src/shared/**/*.js'],
    languageOptions: {
      globals: {
        window: 'off',
        document: 'off',
        navigator: 'off',
        XMLHttpRequest: 'off',
        Image: 'off',
        Modernizr: 'off',
      },
    },
  },
  {
    // Preserved algorithm bodies retain coercion and function-scoped variables.
    // New infrastructure, launch code and runtime loader use the strict rules above.
    files: runtimeCatalog.preservedSources,
    rules: {
      eqeqeq: 'off',
      curly: 'off',
      'no-var': 'off',
      'prefer-const': 'off',
      'no-useless-assignment': 'off',
      'no-self-assign': 'off',
      'no-cond-assign': 'off',
      'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['tooling/**/*.mjs', 'config/**/*.mjs'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['**/scripts/**', '**/tests/**'] }] },
  },
  {
    files: ['tests/e2e/**/*.mjs', 'tests/helpers/runtime-fixture.mjs'],
    languageOptions: {
      globals: { window: 'readonly', document: 'readonly', CSSStyleSheet: 'readonly' },
    },
  },
];
