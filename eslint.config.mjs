import globals from 'globals';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    files: [
      '*.mjs',
    ],
    rules: {
      'arrow-spacing': 'error',
      'camelcase': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'comma-style': 'error',
      'curly': 'error',
      'eol-last': 'error',
      'eqeqeq': 'error',
      'handle-callback-err': 'error',
      'indent': ['error', 2],
      'linebreak-style': 'error',
      'no-return-assign': ['error', 'always'],
      'no-sequences': 'error',
      'no-trailing-spaces': 'error',
      'no-var': 'error',
      'one-var': ['error', 'never'],
      'prefer-const': 'error',
      'rest-spread-spacing': 'error',
      'semi': 'error',
    },
  },
];
