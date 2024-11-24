module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-unused-vars': 'error',
    'no-undef': 'error',
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'jsx-quotes': ['error', 'prefer-double'],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
