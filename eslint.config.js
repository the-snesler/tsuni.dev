// Modified from https://github.com/skeletonlabs/skeleton/blob/main/eslint.config.js
import javascript from '@eslint/js';
import astro from 'eslint-plugin-astro';
import react from 'eslint-plugin-react';
import typescript from 'typescript-eslint';

/**
 * @see https://eslint.org/docs/latest/use/configure/
 * @type {import('eslint').Linter.Config}
 */
export default typescript.config(
  {
    ignores: ['**/node_modules/', '**/dist/', '**/build/', '**/pagefind/', '**/.svelte-kit/', '**/.astro/', '**/.next/', '**/.vercel/']
  },
  // JavaScript
  javascript.configs.recommended,
  // TypeScript
  typescript.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  // Astro
  astro.configs.recommended,
  // React
  {
    files: ['**/*.tsx', '**/*.jsx'],
    ...react.configs.flat.recommended,
    ...react.configs.flat['jsx-runtime']
  }
);
