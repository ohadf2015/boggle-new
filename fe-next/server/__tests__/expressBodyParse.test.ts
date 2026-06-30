import { describe, it, expect } from 'vitest';
import { shouldExpressParseJsonBody } from '../middleware';

/**
 * Regression: /api/admin/teacher-access/[id]/approve|decline are Next.js App
 * Router POST routes with NO Express counterpart. If Express pre-parses their
 * JSON body it drains the IncomingMessage stream, after which the Next handler
 * hangs forever (the await never resolves) → the 30s request-timeout middleware
 * returns 408. They MUST be excluded from Express body parsing.
 */
describe('shouldExpressParseJsonBody — teacher-access Next.js routes', () => {
  it('does NOT pre-parse the teacher-access approve POST body', () => {
    expect(shouldExpressParseJsonBody('/api/admin/teacher-access/abc-123/approve')).toBe(false);
  });

  it('does NOT pre-parse the teacher-access decline POST body', () => {
    expect(shouldExpressParseJsonBody('/api/admin/teacher-access/abc-123/decline')).toBe(false);
  });

  it('does NOT pre-parse the teacher-access list/export (harmless for GET, consistent)', () => {
    expect(shouldExpressParseJsonBody('/api/admin/teacher-access')).toBe(false);
  });

  it('still pre-parses genuine Express admin routes (e.g. curators)', () => {
    expect(shouldExpressParseJsonBody('/api/admin/curators')).toBe(true);
  });
});

/**
 * Regression: POST /api/admin/connections-puzzles/reviews is a Next.js App
 * Router route (bulk-upsert connection-puzzle verdicts) with NO Express
 * counterpart. It reads its body via `await request.json()`. Express pre-parsing
 * drained the stream → the await hung → the admin "mark bad riddles" save failed.
 * MUST be excluded from Express body parsing.
 */
describe('shouldExpressParseJsonBody — connections-puzzles review Next.js route', () => {
  it('does NOT pre-parse the connection-puzzle reviews POST body', () => {
    expect(shouldExpressParseJsonBody('/api/admin/connections-puzzles/reviews')).toBe(false);
  });
});
