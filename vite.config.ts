import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      compiler: true,
    }),
  ],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // JUnit next to the coverage report: the CI pulls both out of the container
    // from the same directory.
    outputFile: { junit: 'coverage/junit.xml' },
    coverage: {
      // istanbul and not v8: merging V8 coverage ranges overflows the stack
      // on Linux with this suite, so it passed locally and failed in the image.
      provider: 'istanbul',
      // cobertura is what the reusable workflow parses, the same format the
      // Python services emit.
      reporter: ['text', 'cobertura'],
      // `include` reports every matching file, tested or not: otherwise the
      // percentage only describes what somebody already remembered to cover.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', '**/*.d.ts'],
    },
  },
});
