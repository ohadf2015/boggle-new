import { describe, it, expect, afterEach } from 'vitest';
import { isAuthorizedCronRequest } from '../cronAuth';

/** Minimal Headers-like carrier (case-insensitive get, like NextRequest). */
const make = (headers: Record<string, string>) => ({
  headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
});

describe('isAuthorizedCronRequest', () => {
  const orig = process.env.CRON_SECRET;
  afterEach(() => {
    if (orig === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = orig;
  });

  it('fails CLOSED when CRON_SECRET is unset (anyone could trigger it before)', () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCronRequest(make({ 'x-cron-secret': 'anything' }))).toBe(false);
  });

  it('fails closed when CRON_SECRET is an empty string', () => {
    process.env.CRON_SECRET = '';
    expect(isAuthorizedCronRequest(make({ 'x-cron-secret': '' }))).toBe(false);
  });

  it('rejects a request with no secret header', () => {
    process.env.CRON_SECRET = 'sekret';
    expect(isAuthorizedCronRequest(make({}))).toBe(false);
  });

  it('rejects a wrong secret', () => {
    process.env.CRON_SECRET = 'sekret';
    expect(isAuthorizedCronRequest(make({ 'x-cron-secret': 'nope' }))).toBe(false);
  });

  it('rejects a wrong-length secret (constant-time guard does not throw)', () => {
    process.env.CRON_SECRET = 'sekret';
    expect(isAuthorizedCronRequest(make({ 'x-cron-secret': 'longer-than-expected' }))).toBe(false);
  });

  it('accepts the correct secret via x-cron-secret', () => {
    process.env.CRON_SECRET = 'sekret';
    expect(isAuthorizedCronRequest(make({ 'x-cron-secret': 'sekret' }))).toBe(true);
  });

  it('accepts the correct secret via bare Authorization header', () => {
    process.env.CRON_SECRET = 'sekret';
    expect(isAuthorizedCronRequest(make({ authorization: 'sekret' }))).toBe(true);
  });

  it('accepts the correct secret via Authorization: Bearer <secret>', () => {
    process.env.CRON_SECRET = 'sekret';
    expect(isAuthorizedCronRequest(make({ authorization: 'Bearer sekret' }))).toBe(true);
  });
});
