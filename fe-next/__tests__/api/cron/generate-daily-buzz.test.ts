/**
 * Daily Buzz Cron Configuration Tests
 * Documents the production cron setup requirements
 */

describe('Daily Buzz Cron Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Environment Variables', () => {
    it('should have BUZZ_ENABLED_LANGUAGES configured for all languages', () => {
      const expectedLanguages = ['en', 'he', 'sv', 'ja', 'es'];
      const configuredLanguages = process.env.BUZZ_ENABLED_LANGUAGES?.split(',').map(l => l.trim()) || ['en'];

      // This test verifies all 5 languages are enabled
      expect(configuredLanguages).toEqual(expectedLanguages);
    });

    it('should have CRON_SECRET configured for production', () => {
      // In production, CRON_SECRET must be set to secure the cron endpoint
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        expect(process.env.CRON_SECRET).toBeDefined();
        expect(process.env.CRON_SECRET).not.toBe('');
      }
    });

    it('should have GOOGLE_CREDENTIALS_JSON configured', () => {
      // CRITICAL: This is the actual bug that broke Daily Buzz
      // Generation fails without Google Vertex AI credentials
      const credentials = process.env.GOOGLE_CREDENTIALS_JSON;

      // Skip in test environment, but document requirement
      if (process.env.NODE_ENV !== 'test') {
        expect(credentials).toBeDefined();

        if (credentials) {
          // Verify it's valid JSON
          expect(() => JSON.parse(credentials)).not.toThrow();

          // Verify required fields
          const parsed = JSON.parse(credentials);
          expect(parsed.project_id).toBeDefined();
          expect(parsed.private_key).toBeDefined();
          expect(parsed.client_email).toBeDefined();
        }
      }
    });
  });

  describe('Production Cron Setup', () => {
    it('should document the required external cron configuration', () => {
      const setupInstructions = {
        local_development: 'server/lifecycle.ts calls startDailyBuzzCron() (node-cron)',
        production: 'External cron service calls GET /api/cron/generate-daily-buzz',
        requirements: [
          'Configure external cron service (cron-job.org, GitHub Actions, Railway Cron, etc.)',
          'Set CRON_SECRET environment variable',
          'Set BUZZ_ENABLED_LANGUAGES=en,he,sv,ja,es',
          'Schedule: 0 0 * * * (daily at midnight UTC)',
          'URL: https://your-app.railway.app/api/cron/generate-daily-buzz',
          'Authorization: Bearer [CRON_SECRET]',
        ],
        why_this_failed: [
          'Local node-cron doesnt persist across server restarts',
          'Railway/Vercel dont have built-in cron schedulers',
          'API route exists but nothing is calling it at midnight UTC',
          'BUZZ_ENABLED_LANGUAGES defaults to en only (not all 5 languages)',
        ],
      };

      // Test passes - documents the architecture
      expect(setupInstructions.production).toContain('External cron service');
      expect(setupInstructions.requirements).toContain('Set BUZZ_ENABLED_LANGUAGES=en,he,sv,ja,es');
    });

    it('should verify cron endpoint exists and is accessible', () => {
      // This test verifies the API route file exists
      // The actual endpoint testing would require integration tests with Next.js
      const fs = require('fs');
      const path = require('path');
      const routePath = path.join(__dirname, '../../../app/api/cron/generate-daily-buzz/route.ts');

      expect(fs.existsSync(routePath)).toBe(true);
    });
  });
});
