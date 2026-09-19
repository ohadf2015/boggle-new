/**
 * Signed adventure attempt: /start issues the board inside an HMAC token,
 * /complete verifies it, so the client can't choose its board, level or clock.
 * Replay is harmless — completions only ever keep the best result.
 */
import { createHmac, timingSafeEqual } from 'crypto';

export interface AttemptPayload {
  u: string;
  w: number;
  l: number;
  g: string[][];
  lang: string;
  /** Issued-at, epoch ms. */
  t: number;
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function signAttempt(payload: AttemptPayload, secret: string): string {
  if (!secret) throw new Error('adventure attempt secret missing');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

export function verifyAttempt(token: string, secret: string): AttemptPayload | null {
  if (!secret || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AttemptPayload;
  } catch {
    return null;
  }
}
