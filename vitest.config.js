import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Each test file runs in its own worker with its own module registry,
    // so each file gets a fresh in-memory DB — full isolation between suites.
    env: {
      DB_PATH: ':memory:',
    },
    reporters: ['verbose'],
  },
});
