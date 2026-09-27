import { createHmac, timingSafeEqual } from 'crypto';
import { type BoostType, isBoostType } from '@/shared/types/boosts';

export const BOOST_TOKEN_TTL_MS = 5 * 60 * 1000;
const VERSION = 'b1';

function getSecret(): string {
  const s = process.env.BOOST_TOKEN_SECRET;
  if (!s) throw new Error('BOOST_TOKEN_SECRET missing');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function signBoostToken(sessionId: string, boostType: BoostType, issuedAt: number = Date.now()): string {
  const exp = issuedAt + BOOST_TOKEN_TTL_MS;
  const payload = `${VERSION}.${sessionId}.${boostType}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export interface VerifyResult {
  valid: boolean;
  boostType?: BoostType;
  reason?: 'malformed' | 'bad_version' | 'session_mismatch' | 'expired' | 'invalid_type' | 'bad_signature';
}

export function verifyBoostToken(token: string, expectedSessionId: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 5) return { valid: false, reason: 'malformed' };
  const [version, sessionId, boostType, expStr, sig] = parts;
  if (version !== VERSION) return { valid: false, reason: 'bad_version' };
  if (sessionId !== expectedSessionId) return { valid: false, reason: 'session_mismatch' };
  if (!isBoostType(boostType)) return { valid: false, reason: 'invalid_type' };
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return { valid: false, reason: 'expired' };
  const expectedSig = sign(`${version}.${sessionId}.${boostType}.${exp}`);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'bad_signature' };
  }
  return { valid: true, boostType: boostType as BoostType };
}
