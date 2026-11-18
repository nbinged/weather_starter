import eslintConfigPrettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sourceFiles = ['frontend/src/**/*.{ts,tsx}', 'backend/src/**/*.ts'];

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: sourceFiles,
  })),
  {
    files: sourceFiles,
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['backend/src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['frontend/src/**/*.{tsx,jsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: globals.browser,
    },
    plugins: {
      ...react.configs.flat.recommended.plugins,
      'react-hooks': reactHooks,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  eslintConfigPrettier,
);
