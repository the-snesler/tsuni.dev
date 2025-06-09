import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // Use jsdom for DOM environment
    globals: true, // Optional: to use vi, describe, it, etc. without importing
    // setupFiles: ['./vitest.setup.js'], // If you need global setup for tests
  },
});
