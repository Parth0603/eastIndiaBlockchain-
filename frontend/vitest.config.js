import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    globals: true,
    testTimeout: 10000, // 10 seconds per test
    hookTimeout: 10000, // 10 seconds for hooks
    teardownTimeout: 10000, // 10 seconds for teardown
    pool: 'forks', // Use forks for better isolation
    poolOptions: {
      forks: {
        singleFork: true // Use single fork to avoid resource issues
      }
    }
  }
});