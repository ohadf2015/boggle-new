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
        preset: 'mobile',
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 2,
          disabled: false,
        },
        throttlingMethod: 'simulate',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
