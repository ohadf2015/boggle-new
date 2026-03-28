import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/contexts': path.resolve(__dirname, './contexts'),
      '@/utils': path.resolve(__dirname, './utils'),
      '@/shared': path.resolve(__dirname, './shared'),
      '@/types': path.resolve(__dirname, './types'),
      // Mock remotion packages
      'remotion': path.resolve(__dirname, './__mocks__/remotion.ts'),
      '@remotion/media': path.resolve(__dirname, './__mocks__/@remotion/media.ts'),
      '@remotion/player': path.resolve(__dirname, './__mocks__/@remotion/player.ts'),
      '@remotion/transitions': path.resolve(__dirname, './__mocks__/@remotion/transitions.ts'),
      '@capgo/capacitor-social-login': path.resolve(__dirname, './__mocks__/@capgo/capacitor-social-login.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    environmentMatchGlobs: [
      // Pure logic tests don't need a DOM — run in fast node environment
      ['utils/**/*.test.ts', 'node'],
      ['shared/**/*.test.ts', 'node'],
      ['lib/**/*.test.ts', 'node'],
      ['types/**/*.test.ts', 'node'],
    ],
    include: [
      'components/**/*.test.{ts,tsx}',
      'hooks/**/*.test.{ts,tsx}',
      'contexts/**/*.test.{ts,tsx}',
      'utils/**/*.test.{ts,tsx}',
      'app/**/*.test.{ts,tsx}',
      'host/**/*.test.{ts,tsx}',
      'player/**/*.test.{ts,tsx}',
      'types/**/*.test.{ts,tsx}',
      'lib/**/*.test.{ts,tsx}',
      'shared/**/*.test.{ts,tsx}',
      'stores/**/*.test.{ts,tsx}',
      '__tests__/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'backend',
      '.next',
      'dist',
      '**/LandingView.botLaunch.test.tsx',
      '**/PresetSelector.simplified.test.tsx',
      '**/PresetSelector.featureGates.test.tsx',
      '**/SinglePlayerLobby.featureGates.test.tsx',
      '**/SinglePlayer.navigation.test.tsx',
      '**/ResultsPage.touch-scroll.test.tsx',
      '**/ClassroomGameLobby.test.tsx',
      '**/useAdaptiveDifficulty.test.ts',
      '**/MusicContext.duplicateProvider.test.tsx',
      '**/MusicContext.ios.test.tsx',
      '**/LandingView.spacing.test.tsx',
      '**/useUnclaimedGifts.bug.test.tsx',
      '**/CircularTimer.test.tsx',
      '**/AdventureGame.lexi.test.tsx',
      '**/AdventureGame.bossIntegration.test.tsx',
      '**/useAdventureCurrency.test.ts',
    ],
    testTimeout: 10000,
    pool: 'threads',
    maxThreads: 12,
    minThreads: 4,
    useAtomics: true,
    teardownTimeout: 5000,
    hookTimeout: 10000,
    fileParallelism: true,
    clearMocks: true,
    restoreMocks: false,
    css: {
      modules: { classNameStrategy: 'non-scoped' },
    },
    // Deps optimizer: bundle heavy node_modules into single files to reduce import overhead
    deps: {
      optimizer: {
        web: {
          enabled: true,
          include: [
            'framer-motion',
            '@radix-ui/*',
            '@tanstack/react-query',
            'zustand',
            'zod',
            'socket.io-client',
            '@testing-library/react',
            '@testing-library/jest-dom',
          ],
        },
      },
    },
    // Cache transformed modules to disk for faster reruns
    experimental: {
      fsModuleCache: true,
    },
    coverage: {
      provider: 'v8',
      include: ['components/**', 'hooks/**', 'contexts/**', 'utils/**', 'lib/**', 'shared/**', 'stores/**'],
      exclude: ['**/*.d.ts', '**/*.test.*', '**/*.spec.*'],
      thresholds: { branches: 10, functions: 10, lines: 10, statements: 10 },
    },
  },
});
