import { describe, it, expect } from 'vitest';
import { shouldExpressParseJsonBody } from '../server/middleware';

describe('shouldExpressParseJsonBody', () => {
  it('parses for Express-handled admin paths', () => {
    expect(shouldExpressParseJsonBody('/api/admin/stats')).toBe(true);
    expect(shouldExpressParseJsonBody('/api/admin/send-test-email')).toBe(true);
    expect(shouldExpressParseJsonBody('/api/admin/community-words/approve')).toBe(true);
  });

  it('parses for other Express API namespaces', () => {
    expect(shouldExpressParseJsonBody('/api/leaderboard/global')).toBe(true);
    expect(shouldExpressParseJsonBody('/api/dictionary/check')).toBe(true);
  });

  it('skips parsing for Next-only admin POST routes — Express body-parser drains the IncomingMessage and Next request.json() then hangs forever', () => {
    expect(shouldExpressParseJsonBody('/api/admin/send-test-android-beta-launch')).toBe(false);
    expect(shouldExpressParseJsonBody('/api/admin/send-android-beta-launch-to-player')).toBe(false);
    expect(shouldExpressParseJsonBody('/api/admin/send-test-android-release-launch')).toBe(false);
    expect(shouldExpressParseJsonBody('/api/admin/send-android-release-launch-to-player')).toBe(false);
    // Bulk send-to-all reads request.json() in the Next route too.
    expect(shouldExpressParseJsonBody('/api/admin/send-bulk-email')).toBe(false);
  });

  it('skips parsing for non-API routes', () => {
    expect(shouldExpressParseJsonBody('/')).toBe(false);
    expect(shouldExpressParseJsonBody('/some-page')).toBe(false);
    expect(shouldExpressParseJsonBody('/_next/static/chunk.js')).toBe(false);
  });
});
