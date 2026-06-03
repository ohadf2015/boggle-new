/**
 * Lighthouse CI — mobile profile. Run via `npm run lighthouse:ci:mobile`
 * (`lhci autorun --config=./lighthouserc.mobile.cjs`).
 *
 * The CI `lighthouse` job builds the app first, then this config boots the
 * project's custom server (`npm run start`, which listens on PORT 3001 and
 * logs "Server ready") and audits a representative route.
 *
 * Assertions are intentionally `warn`-level: the job is non-gating
 * (`continue-on-error: true`, and not part of the `ci-success` gate), so it
 * should surface regressions without hard-failing. Tighten the minScores or
 * add performance budgets here once the team agrees on thresholds.
 *
 * Reports are written to ./.lighthouseci (gitignored) rather than uploaded to
 * temporary public storage, so the run needs no extra network/credentials.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Server ready',
      startServerReadyTimeout: 120000,
      url: ['http://localhost:3001/en'],
      numberOfRuns: 1,
      settings: {
        // Lighthouse's default form factor is already mobile; make it explicit.
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 1.75,
          disabled: false,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
      reportFilenamePattern: 'mobile-%%PATHNAME%%-%%DATETIME%%.report.%%EXTENSION%%',
    },
  },
};
