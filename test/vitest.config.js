import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000, // 30 seconds per test
    hookTimeout: 10000, // 10 seconds for hooks
    teardownTimeout: 10000, // 10 seconds for teardown
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
});