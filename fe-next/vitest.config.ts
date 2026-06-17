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
      '@vfx-js/core': path.resolve(__dirname, './__mocks__/@vfx-js/core.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    environmentMatchGlobs: [
      // Pure logic tests don't need a DOM — run in fast node environment
      ['utils/**/*.test.{ts,tsx}', 'node'],
      ['shared/**/*.test.{ts,tsx}', 'node'],
      ['lib/**/*.test.{ts,tsx}', 'node'],
      ['types/**/*.test.{ts,tsx}', 'node'],
      ['stores/**/*.test.{ts,tsx}', 'node'],
      ['app/api/**/*.test.{ts,tsx}', 'node'],
      ['app/**/page.test.{ts,tsx}', 'node'],
      ['components/**/utils/**/*.test.{ts,tsx}', 'node'],
      // .test.ts files (not .tsx) in components/hooks rarely need DOM
      ['components/**/*.test.ts', 'node'],
      ['hooks/**/*.test.ts', 'node'],
      ['hooks/__tests__/**/*.test.ts', 'node'],
      ['host/**/*.test.{ts,tsx}', 'node'],
      ['player/**/*.test.{ts,tsx}', 'node'],
      ['__tests__/**/*.test.{ts,tsx}', 'node'],
      // .tsx files that don't use DOM APIs — verified by grep
      ['contexts/**/*.test.tsx', 'node'],
      ['components/game/__tests__/keyboardTrailsUtils.timing.test.tsx', 'node'],
      ['components/game/__tests__/KeyboardTrailsDisplay.test.tsx', 'node'],
      ['components/adventure/__tests__/entry-timing.test.tsx', 'node'],
      ['components/adventure/__tests__/AdventureGame.skillBalance.test.tsx', 'node'],
      ['components/adventure/__tests__/useGridGestures.haptic.test.tsx', 'node'],
      ['components/adventure/__tests__/AdventureGame.playerHealth.test.tsx', 'node'],
      ['components/adventure/__tests__/AdventureGame.autoComplete.test.tsx', 'node'],
      ['components/daily/__tests__/ButtonContrastAccessibility.test.tsx', 'node'],
      ['components/daily/__tests__/bug-fixes.test.tsx', 'node'],
      ['components/daily/__tests__/DailyChallenge.test.tsx', 'node'],
      ['components/__tests__/BugFixes.test.tsx', 'node'],
      ['components/__tests__/NeoToast.contrast.test.tsx', 'node'],
      ['components/__tests__/dead-code-i18n-sprint4.test.tsx', 'node'],
      ['components/__tests__/SinglePlayerResults.test.tsx', 'node'],
      ['components/__tests__/ProfileCustomizationModal.test.tsx', 'node'],
      ['components/__tests__/PlayerView.navigation.test.tsx', 'node'],
      ['components/__tests__/ResultsPage.test.tsx', 'node'],
      ['components/__tests__/Header.giftNavigation.test.tsx', 'node'],
      ['components/__tests__/ExitConfirmation.allGameModes.test.tsx', 'node'],
      ['components/blast/__tests__/BlastGame.confetti.test.tsx', 'node'],
      ['components/singleplayer/__tests__/SinglePlayerResults.landscape-layout.test.tsx', 'node'],
      ['components/auth/__tests__/WordHuntLoginModal.test.tsx', 'node'],
      ['components/custom-puzzle/__tests__/CustomPuzzleCreator.test.tsx', 'node'],
      ['components/student/__tests__/LessonPractice.hebrewNormalization.test.tsx', 'node'],
      ['components/admin/wikipedia-words/__tests__/adminDashboard.integration.test.tsx', 'node'],
      ['app/components/__tests__/ProfileCustomizationWrapper.test.tsx', 'node'],
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
      'server/**/*.test.{ts,tsx}',
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
      '**/reengagementEmail.test.ts',
    ],
    testTimeout: 10000,
    // pool:'forks' uses child_process.fork — each worker is a separate OS
    // process, so memory is fully reclaimed between files. worker_threads
    // ('threads') recycles heap across files; by file ~470 the accumulated
    // memory exceeds the per-thread limit causing ERR_WORKER_OUT_OF_MEMORY.
    // Forks also inherit NODE_OPTIONS (threads do not), which lets CI set
    // a larger heap limit when needed.
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 4,
        minForks: 1,
        // Raise the V8 heap limit for fork child processes. Without this, forks
        // accumulate memory across sequentially-assigned test files and crash
        // with "Reached heap limit Allocation failed" at ~4 GB (the Node.js
        // default), causing "Worker exited unexpectedly" in Vitest teardown.
        execArgv: ['--max-old-space-size=8192'],
      },
    },
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
    // Cache transformed modules to disk for faster reruns.
    // DISABLED: on large --changed fan-outs (e.g. a hub-file edit pulling ~900
    // test files) the on-disk cache (node_modules/.experimental-vitest-cache)
    // races — workers read entries another worker already evicted — producing
    // phantom `ENOENT .../.experimental-vitest-cache/<hash>` failures (142 file
    // / 7 test false-failures on 2026-06-05) that fail the pre-push gate even
    // though every test passes in isolation. --no-file-parallelism + a pre-run
    // cache wipe did NOT eliminate it. A reliable gate outweighs rerun speed.
    experimental: {
      fsModuleCache: false,
    },
    coverage: {
      provider: 'v8',
      include: ['components/**', 'hooks/**', 'contexts/**', 'utils/**', 'lib/**', 'shared/**', 'stores/**'],
      exclude: ['**/*.d.ts', '**/*.test.*', '**/*.spec.*'],
      thresholds: { branches: 10, functions: 10, lines: 10, statements: 10 },
    },
  },
});
