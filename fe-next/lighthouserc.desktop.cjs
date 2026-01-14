module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'NODE_ENV=production PORT=3001 npm run start',
      startServerReadyPattern: 'Server ready on',
      url: [
        'http://localhost:3001/en',
        'http://localhost:3001/en/daily',
        'http://localhost:3001/en/leaderboard',
        'http://localhost:3001/en/multiplayer',
        'http://localhost:3001/en/profile',
      ],
      settings: {
        preset: 'desktop',
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttlingMethod: 'simulate',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
