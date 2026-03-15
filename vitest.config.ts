import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        statements: 100,
        functions: 100,
        branches: 100,
        lines: 100,
      },
      provider: 'v8',
    },
  },
})
