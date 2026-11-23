import { test as base, expect } from '@playwright/test';

// Runs against production, so the browser must not write anything or count as a visitor:
// every non-GET request and every third-party request except fonts and the Supabase
// storage CDN is aborted. That also blocks guest sign-in, score posts and every
// analytics beacon (PostHog, GA, Growth Radar, Sentry, ads).
const ALLOWED_THIRD_PARTY = /^https:\/\/(fonts\.(googleapis|gstatic)\.com|[a-z0-9]+\.supabase\.co\/storage\/)/;

export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: async ({ page, baseURL }, provide) => {
    const origin = new URL(baseURL!).origin;
    await page.route('**/*', (route) => {
      const req = route.request();
      const url = req.url();
      const firstParty = url.startsWith(origin);
      if (req.method() !== 'GET') return route.abort();
      if (firstParty && /\/(ingest|monitoring)(\/|\?|$)/.test(new URL(url).pathname)) return route.abort();
      if (!firstParty && !url.startsWith('data:') && !ALLOWED_THIRD_PARTY.test(url)) return route.abort();
      return route.continue();
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await provide(errors);
  },
});

export { expect };
