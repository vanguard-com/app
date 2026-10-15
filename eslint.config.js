// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', 'coverage/*', '.expo/*'],
  },
  {
    rules: {
      'react/jsx-no-useless-fragment': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]);
