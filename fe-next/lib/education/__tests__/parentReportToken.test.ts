import { describe, it, expect, afterEach } from 'vitest';
import {
  signParentReportToken,
  verifyParentReportToken,
  parentReportUrl,
  PARENT_REPORT_TOKEN_DAYS,
} from '../parentReportToken';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('parentReportToken', () => {
  const orig = process.env.PARENT_REPORT_SECRET;
  afterEach(() => {
    if (orig === undefined) delete process.env.PARENT_REPORT_SECRET;
    else process.env.PARENT_REPORT_SECRET = orig;
  });

  describe('signParentReportToken', () => {
    it('Given no PARENT_REPORT_SECRET configured, When signing, Then it throws (fail closed)', () => {
      delete process.env.PARENT_REPORT_SECRET;
      expect(() => signParentReportToken('student-1', 'classroom-1')).toThrow();
    });

    it('Given an empty PARENT_REPORT_SECRET, When signing, Then it throws (fail closed)', () => {
      process.env.PARENT_REPORT_SECRET = '';
      expect(() => signParentReportToken('student-1', 'classroom-1')).toThrow();
    });

    it('Given a configured secret, When signing, Then it returns a non-empty dotted token', () => {
      process.env.PARENT_REPORT_SECRET = 'sekret';
      const token = signParentReportToken('student-1', 'classroom-1');
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(2);
    });

    it('defaults the expiry to 30 days out', () => {
      expect(PARENT_REPORT_TOKEN_DAYS).toBe(30);
    });
  });

  describe('verifyParentReportToken', () => {
    it('Given a token signed with the current secret, When verified before expiry, Then it returns the payload', () => {
      process.env.PARENT_REPORT_SECRET = 'sekret';
      const now = Date.parse('2026-01-01T00:00:00.000Z');
      const token = signParentReportToken('student-1', 'classroom-1', now);
      const payload = verifyParentReportToken(token, now + DAY_MS);
      expect(payload).toEqual({
        studentId: 'student-1',
        classroomId: 'classroom-1',
        exp: now + PARENT_REPORT_TOKEN_DAYS * DAY_MS,
      });
    });

    it('Given the token has expired (30+ days later), When verified, Then it returns null', () => {
      process.env.PARENT_REPORT_SECRET = 'sekret';
      const now = Date.parse('2026-01-01T00:00:00.000Z');
      const token = signParentReportToken('student-1', 'classroom-1', now);
      const payload = verifyParentReportToken(token, now + 31 * DAY_MS);
      expect(payload).toBeNull();
    });

    it('Given the token is exactly at its expiry instant, When verified, Then it returns null (exp is exclusive)', () => {
      process.env.PARENT_REPORT_SECRET = 'sekret';
      const now = Date.parse('2026-01-01T00:00:00.000Z');
      const token = signParentReportToken('student-1', 'classroom-1', now);
      const exp = now + PARENT_REPORT_TOKEN_DAYS * DAY_MS;
      expect(verifyParentReportToken(token, exp)).toBeNull();
    });

    it('Given the payload body was tampered with (studentId swapped), When verified, Then it returns null', () => {
      process.env.PARENT_REPORT_SECRET = 'sekret';
      const now = Date.parse('2026-01-01T00:00:00.000Z');
      const token = signParentReportToken('student-1', 'classroom-1', now);
      const [body, sig] = token.split('.');
      const tamperedPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      tamperedPayload.studentId = 'someone-elses-student';
      const tamperedBody = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');
      const tampered = `${tamperedBody}.${sig}`;
      expect(verifyParentReportToken(tampered, now)).toBeNull();
    });

    it('Given the signature was tampered with (wrong length), When verified, Then it returns null', () => {
      process.env.PARENT_REPORT_SECRET = 'sekret';
      const now = Date.parse('2026-01-01T00:00:00.000Z');
      const token = signParentReportToken('student-1', 'classroom-1', now);
      const [body] = token.split('.');
      const tampered = `${body}.${'a'.repeat(40)}`;
      expect(verifyParentReportToken(tampered, now)).toBeNull();
    });

    it('Given the signature was tampered with (same length, one char flipped), When verified, Then it returns null', () => {
      process.env.PARENT_REPORT_SECRET = 'sekret';
      const now = Date.parse('2026-01-01T00:00:00.000Z');
      const token = signParentReportToken('student-1', 'classroom-1', now);
      const [body, sig] = token.split('.');
      const flippedChar = sig[0] === 'a' ? 'b' : 'a';
      const flippedSig = flippedChar + sig.slice(1);
      const tampered = `${body}.${flippedSig}`;
      expect(verifyParentReportToken(tampered, now)).toBeNull();
    });

    it('Given a token signed under a different secret, When verified under the current secret, Then it returns null', () => {
      process.env.PARENT_REPORT_SECRET = 'sekret-one';
      const now = Date.parse('2026-01-01T00:00:00.000Z');
      const token = signParentReportToken('student-1', 'classroom-1', now);
      process.env.PARENT_REPORT_SECRET = 'sekret-two';
      expect(verifyParentReportToken(token, now)).toBeNull();
    });

    it('Given a malformed token (no separator), When verified, Then it returns null', () => {
      process.env.PARENT_REPORT_SECRET = 'sekret';
      expect(verifyParentReportToken('not-a-real-token', Date.now())).toBeNull();
    });

    it('Given a non-string token, When verified, Then it returns null', () => {
      process.env.PARENT_REPORT_SECRET = 'sekret';
      expect(verifyParentReportToken(undefined, Date.now())).toBeNull();
      expect(verifyParentReportToken(null, Date.now())).toBeNull();
      expect(verifyParentReportToken(42, Date.now())).toBeNull();
    });

    it('Given no PARENT_REPORT_SECRET configured, When verifying any token, Then it returns null (fail closed, never throws)', () => {
      process.env.PARENT_REPORT_SECRET = 'sekret';
      const now = Date.parse('2026-01-01T00:00:00.000Z');
      const token = signParentReportToken('student-1', 'classroom-1', now);
      delete process.env.PARENT_REPORT_SECRET;
      expect(() => verifyParentReportToken(token, now)).not.toThrow();
      expect(verifyParentReportToken(token, now)).toBeNull();
    });
  });

  describe('parentReportUrl', () => {
    it('Given an origin, language and token, When building the url, Then it locale-prefixes /report/<token>', () => {
      expect(parentReportUrl('https://lexiclash.live', 'he', 'abc.def')).toBe(
        'https://lexiclash.live/he/report/abc.def',
      );
    });

    it('strips a trailing slash from the origin', () => {
      expect(parentReportUrl('https://lexiclash.live/', 'en', 'tok')).toBe(
        'https://lexiclash.live/en/report/tok',
      );
    });
  });
});
