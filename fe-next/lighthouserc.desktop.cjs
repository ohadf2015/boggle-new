/**
 * Lighthouse CI — desktop profile. Run via `npm run lighthouse:ci:desktop`
 * (`lhci autorun --config=./lighthouserc.desktop.cjs`), after the mobile pass.
 *
 * Same booting/upload strategy as lighthouserc.mobile.cjs (see that file's
 * header) — boots the custom server on PORT 3001, audits one representative
 * route, warn-level assertions, reports written to ./.lighthouseci.
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
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        // Desktop typically scores higher than mobile; keep warn-level so a dip
        // is visible in the report without failing the (non-gating) check.
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
      reportFilenamePattern: 'desktop-%%PATHNAME%%-%%DATETIME%%.report.%%EXTENSION%%',
    },
  },
};
