import { describe, it, expect } from 'vitest';
import { acceptsEncoding, normalizeAcceptEncoding } from '../acceptEncoding';

describe('acceptsEncoding', () => {
  it('matches a plain token', () => {
    expect(acceptsEncoding('gzip, deflate, br, zstd', 'br')).toBe(true);
    expect(acceptsEncoding('gzip, deflate', 'br')).toBe(false);
  });

  it('matches a token carrying a positive q-value', () => {
    expect(acceptsEncoding('br;q=0.5, gzip', 'br')).toBe(true);
    expect(acceptsEncoding('br; q = 1.0', 'br')).toBe(true);
  });

  it('treats q=0 as a refusal', () => {
    expect(acceptsEncoding('gzip, br;q=0', 'br')).toBe(false);
    expect(acceptsEncoding('gzip, br;q=0.0', 'br')).toBe(false);
  });

  it('is not fooled by names that merely contain the token', () => {
    // The naive `.includes('br')` this replaces matched both of these.
    expect(acceptsEncoding('gzip, brotli-ish', 'br')).toBe(false);
    expect(acceptsEncoding('x-gzip', 'gzip')).toBe(false);
  });

  it('is case-insensitive and tolerates whitespace', () => {
    expect(acceptsEncoding('  GZIP , BR ', 'br')).toBe(true);
  });

  it('does not treat a wildcard as an explicit opt-in', () => {
    expect(acceptsEncoding('*', 'br')).toBe(false);
  });

  it('handles a missing header', () => {
    expect(acceptsEncoding(undefined, 'br')).toBe(false);
    expect(acceptsEncoding('', 'br')).toBe(false);
  });
});

describe('normalizeAcceptEncoding', () => {
  it('collapses a real browser header to br so brotli wins the negotiation', () => {
    expect(normalizeAcceptEncoding('gzip, deflate, br, zstd')).toBe('br');
  });

  it('collapses even when br carries an explicit q-value', () => {
    expect(normalizeAcceptEncoding('br;q=1.0, gzip;q=0.5')).toBe('br');
  });

  it('leaves a gzip-only client untouched', () => {
    expect(normalizeAcceptEncoding('gzip, deflate')).toBe('gzip, deflate');
  });

  it('leaves a client that explicitly refuses br untouched', () => {
    expect(normalizeAcceptEncoding('gzip, deflate, br;q=0')).toBe('gzip, deflate, br;q=0');
  });

  it('does not invent a header when the client sent none', () => {
    expect(normalizeAcceptEncoding(undefined)).toBeUndefined();
  });
});
