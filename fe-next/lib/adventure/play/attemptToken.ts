/**
 * Signed adventure attempt: /start issues the board inside an HMAC token,
 * /complete verifies it, so the client can't choose its board, level or clock.
 * Replay is harmless — completions only ever keep the best result.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import type { LevelKind } from './levels';
import type { RelicId } from './relics';
import type { RunPayload } from './runToken';

export interface AttemptPayload {
  u: string;
  w: number;
  l: number;
  g: string[][];
  lang: string;
  /** Issued-at, epoch ms. */
  t: number;
  /** Level kind at issue time (settle rules). Absent on legacy tokens → level table. */
  k?: LevelKind;
  /** Relics owned when the level started — the ONLY relics settle ever applies. */
  r?: RelicId[];
  /** Hunt only: the target words dealt onto the board. */
  tg?: string[];
  /** Time potions held at start (each may extend the clock). */
  tp?: number;
  /** Star thresholds tuned to the board dealt. Absent on legacy tokens -> level table. */
  st?: [number, number, number];
  /** Enemy HP tuned to the same board (combat kinds only). */
  eh?: number;
  /** The run this attempt belongs to (after the pick), advanced by /complete on a win. */
  run?: RunPayload;
}

/** HMAC over `domain:body` — the domain keeps attempt and run tokens from being swapped. */
function sign(body: string, secret: string, domain: string): string {
  return createHmac('sha256', secret).update(domain ? `${domain}:${body}` : body).digest('base64url');
}

export function signPayload(payload: object, secret: string, domain = ''): string {
  if (!secret) throw new Error('adventure token secret missing');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret, domain)}`;
}

export function verifyPayload<T>(token: unknown, secret: string, domain = ''): T | null {
  if (!secret || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body, secret, domain));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

export function signAttempt(payload: AttemptPayload, secret: string): string {
  return signPayload(payload, secret, 'attempt');
}

export function verifyAttempt(token: unknown, secret: string): AttemptPayload | null {
  return verifyPayload<AttemptPayload>(token, secret, 'attempt');
}
