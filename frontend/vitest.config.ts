import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Unit tests are named *.unit.test.ts so they never collide with the Playwright
// e2e specs under ./tests (which run via `npm run test:e2e`).
export default defineConfig({
  test: {
    include: ['**/*.unit.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
