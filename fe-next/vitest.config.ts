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
      'canvas-confetti': path.resolve(__dirname, './__mocks__/canvas-confetti.ts'),
      // More-specific gsap sub-package aliases must come before the base 'gsap' alias.
      // Vite alias matching does prefix+/ replacement, so 'gsap' would intercept
      // 'gsap/ScrollTrigger' if listed first, producing a non-existent path.
      'gsap/ScrollTrigger': path.resolve(__dirname, './__mocks__/gsap/ScrollTrigger.ts'),
      '@gsap/react': path.resolve(__dirname, './__mocks__/@gsap/react.ts'),
      'gsap': path.resolve(__dirname, './__mocks__/gsap.ts'),
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
      'scripts/**/*.test.{ts,tsx}',
      '__tests__/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'backend',
      '.next',
      '.next-*/**',
      'dist',
      // Nested agent checkouts under .claude/worktrees/ contain a full copy of
      // every test file. Without this, a bare `vitest run <path>` matches the
      // copies too — and any worktree missing node_modules fails the whole run
      // with "Cannot find package '@testing-library/react'" on files that are
      // fine here. Tests in a worktree belong to that worktree's own run.
      '**/.claude/worktrees/**',
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
      '**/SinglePlayerGame.achievements.test.tsx',
      '**/PracticeWheelSandbox.drag.test.tsx',
      '**/PracticeWheelSandbox.completion.test.tsx',
      '**/ScoreReadout.test.tsx',
      '**/AdventureGame.autoComplete.test.tsx',
      '**/growthTracking.referralClick.test.ts',
      '**/blastLockedRemoval.test.ts',
      '**/useAdventureInventory.test.ts',
      '**/CookieConsent.mascot.test.tsx',
      '**/gridAriaLabel.i18n.test.ts',
      '**/loading-layout.test.tsx',
      '**/chain-builder.test.ts',
      '**/CrazyGamesSDK.authOutcome.test.tsx',
      '**/CrazyGamesSDK.embedSticky.test.tsx',
      '**/ChallengeResults.test.tsx',
      '**/BlastFxOverlay.test.tsx',
      '**/BoardClearedCard.test.tsx',
    ],
    testTimeout: 30000,
    pool: 'forks',
    // ponytail: 8×5120MB=40GB ceiling exceeded the nightly box's 32GB RAM under
    // chronic load (avg 6-13, see 60-recurring-pitfalls.md) → forks timed out
    // spawning, wedging every 2026-07-13/07-14 gate tier. 4×5120=20GB leaves
    // headroom. Raise again only if a real single-file OOM reappears (shard-6
    // history: heap size wasn't the cause there — a teardown crash was).
    // NOTE: Vitest 4 removed maxForks/minForks — these were silently ignored,
    // letting the pool spawn one fork per CPU (48) and blow the box's
    // pids.max=1000 cgroup (EAGAIN spawn / uv_thread_create aborts).
    maxWorkers: 4,
    // Vitest 4 moved per-worker node args from poolOptions.forks.execArgv to a
    // top-level test.execArgv (the old key was silently ignored). Caps each
    // fork's heap so the pool can't OOM under chronic nightly-box load.
    execArgv: ['--max-old-space-size=5120'],
    teardownTimeout: 30000,
    hookTimeout: 30000,
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
