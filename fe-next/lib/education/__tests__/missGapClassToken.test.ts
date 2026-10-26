import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  signMissGapClassToken,
  verifyMissGapClassToken,
  classTokenStatus,
} from '../missGapClassToken';
import { signParentReportToken } from '../parentReportToken';

// Computed outside this codebase (Python hmac/sha256 over `miss-gap-class:<body>`,
// secret 'fixture-secret'), so a signer that drifts from the wire format fails here.
const KEY = 'week 3 nouns::ms smith';
const GOLDEN_V1 =
  'eyJjbGFzc0tleSI6IndlZWsgMyBub3Vuczo6bXMgc21pdGgiLCJ2IjoxfQ.TPYYGo9ruc9IvuyJP24vySn98IsnaSm0dhZC1w9xqOQ';
const GOLDEN_V2 =
  'eyJjbGFzc0tleSI6IndlZWsgMyBub3Vuczo6bXMgc21pdGgiLCJ2IjoyfQ.19DLXbQyvIjXW88TYmQgepUt-wf5e8IfidXM3sAL-2w';

function flipChar(token: string, index: number): string {
  const c = token[index];
  return token.slice(0, index) + (c === 'A' ? 'B' : 'A') + token.slice(index + 1);
}

describe('missGapClassToken', () => {
  const orig = process.env.PARENT_REPORT_SECRET;
  beforeEach(() => {
    process.env.PARENT_REPORT_SECRET = 'fixture-secret';
  });
  afterEach(() => {
    if (orig === undefined) delete process.env.PARENT_REPORT_SECRET;
    else process.env.PARENT_REPORT_SECRET = orig;
  });

  it('Given the fixture secret, When signing the class key, Then it equals the independently computed token', () => {
    expect(signMissGapClassToken(KEY)).toBe(GOLDEN_V1);
  });

  it('accepts the golden token for its own class key', () => {
    expect(verifyMissGapClassToken(GOLDEN_V1, KEY)).toBe(true);
  });

  it('signs and checks the server spelling of the key (case, spacing)', () => {
    expect(verifyMissGapClassToken(GOLDEN_V1, '  Week   3 Nouns::MS Smith ')).toBe(true);
    expect(signMissGapClassToken('Week  3 NOUNS::ms smith')).toBe(GOLDEN_V1);
  });

  it('rejects a token with one byte changed in the payload', () => {
    expect(verifyMissGapClassToken(flipChar(GOLDEN_V1, 5), KEY)).toBe(false);
  });

  it('rejects a token with one byte changed in the signature', () => {
    expect(verifyMissGapClassToken(flipChar(GOLDEN_V1, GOLDEN_V1.length - 3), KEY)).toBe(false);
  });

  it('rejects the golden token under a different secret', () => {
    process.env.PARENT_REPORT_SECRET = 'another-secret';
    expect(verifyMissGapClassToken(GOLDEN_V1, KEY)).toBe(false);
  });

  it('rejects a valid token replayed on another class key', () => {
    expect(verifyMissGapClassToken(GOLDEN_V1, 'week 4 verbs::ms smith')).toBe(false);
    expect(verifyMissGapClassToken(signMissGapClassToken('week 4 verbs::ms smith'), KEY)).toBe(false);
  });

  it('rejects a correctly signed token of an unknown version', () => {
    expect(verifyMissGapClassToken(GOLDEN_V2, KEY)).toBe(false);
  });

  it('rejects a parent-report token signed with the same secret', () => {
    expect(verifyMissGapClassToken(signParentReportToken('s1', 'c1'), KEY)).toBe(false);
  });

  it('rejects non-string and malformed input', () => {
    for (const bad of [undefined, null, 42, {}, '', 'abc', 'a.b.c', '.']) {
      expect(verifyMissGapClassToken(bad, KEY)).toBe(false);
    }
  });

  it('fails closed with no secret: signing throws, nothing verifies', () => {
    delete process.env.PARENT_REPORT_SECRET;
    expect(() => signMissGapClassToken(KEY)).toThrow();
    expect(verifyMissGapClassToken(GOLDEN_V1, KEY)).toBe(false);
  });

  describe('classTokenStatus', () => {
    it('treats a missing or blank token as an old link, not a forgery', () => {
      expect(classTokenStatus(undefined, KEY)).toBe('absent');
      expect(classTokenStatus(null, KEY)).toBe('absent');
      expect(classTokenStatus('', KEY)).toBe('absent');
      expect(classTokenStatus('   ', KEY)).toBe('absent');
    });

    it('separates a valid token from a forged one', () => {
      expect(classTokenStatus(GOLDEN_V1, KEY)).toBe('valid');
      expect(classTokenStatus(flipChar(GOLDEN_V1, 5), KEY)).toBe('invalid');
      expect(classTokenStatus(GOLDEN_V1, 'other::class')).toBe('invalid');
    });
  });
});
