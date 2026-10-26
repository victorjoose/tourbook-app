import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Run by `pnpm rules:test` (firebase emulators:exec … "vitest run --root firebase").
// The suites talk to one shared emulator, so files run one at a time.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
})
