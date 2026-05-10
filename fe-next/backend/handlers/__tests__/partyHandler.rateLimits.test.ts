/**
 * Source-contract test for partyHandler rate-limiting + room cleanup
 * (audit 2026-05-10).
 *
 * partyHandler had ZERO rate limits before this commit — every party event
 * (create/join/startGame/input) was unbounded, and the 30-min stale sweep
 * leaked socket.io adapter subscriptions. This test pins the wiring at
 * syntactic level so future refactors can't silently regress.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../partyHandler.ts'),
  'utf8',
);

describe('partyHandler — rate-limit + cleanup wiring', () => {
  it('imports checkRateLimit from rateLimiter', () => {
    expect(source).toMatch(/from\s+['"]\.\.\/utils\/rateLimiter\.js['"]/);
    expect(source).toMatch(/checkRateLimit/);
  });

  it('rate-limits party:create (heavy weight ≥3)', () => {
    const block = /socket\.on\(['"]party:create['"][\s\S]{0,300}checkRateLimit\(socket\.id,\s*[3-9]\)/;
    expect(source).toMatch(block);
  });

  it('rate-limits party:join (weight ≥3)', () => {
    const block = /socket\.on\(['"]party:join['"][\s\S]{0,300}checkRateLimit\(socket\.id,\s*[3-9]\)/;
    expect(source).toMatch(block);
  });

  it('rate-limits party:startGame', () => {
    const block = /socket\.on\(['"]party:startGame['"][\s\S]{0,200}checkRateLimit\(socket\.id/;
    expect(source).toMatch(block);
  });

  it('rate-limits party:input (light weight, silent drop for live-stroke)', () => {
    const block = /socket\.on\(['"]party:input['"][\s\S]{0,200}checkRateLimit\(socket\.id\)/;
    expect(source).toMatch(block);
  });

  it('cleanupRoom evicts sockets from socket.io room when io is provided', () => {
    expect(source).toMatch(/socketsLeave\(`party:\$\{roomCode\}`\)/);
  });

  it('startStaleSweep is registered + interval is unref-safe', () => {
    expect(source).toMatch(/startStaleSweep\(io\)/);
    expect(source).toMatch(/staleSweepInterval\.unref/);
  });

  it('handlePlayerLeave passes io to cleanupRoom', () => {
    // Both call sites in handlePlayerLeave should forward io
    const calls = source.match(/cleanupRoom\(room\.roomCode,\s*io\)/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });
});
