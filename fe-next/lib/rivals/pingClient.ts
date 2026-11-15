import type { PingSituation, RivalPingErrorCode, RivalPingId } from './pings';

export interface IncomingPingView {
  id: string;
  pingId: RivalPingId;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar: { emoji: string | null; color: string | null; image: string | null; config: unknown };
  };
}

/** Where a ping was sent from: a results screen, or a ping-back from the incoming toast. */
export type PingContext = PingSituation;

export type SendResult = { ok: true } | { ok: false; code: RivalPingErrorCode };

export async function sendRivalPing(targetUserId: string, pingId: RivalPingId, context: PingContext): Promise<SendResult> {
  try {
    const res = await fetch('/api/rivals/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, pingId, context }),
    });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => null)) as { error?: RivalPingErrorCode } | null;
    return { ok: false, code: body?.error ?? (res.status === 401 ? 'sign_in_required' : 'unavailable') };
  } catch {
    return { ok: false, code: 'unavailable' };
  }
}

export async function fetchIncomingPings(): Promise<IncomingPingView[]> {
  try {
    const res = await fetch('/api/rivals/pings', { cache: 'no-store' });
    if (!res.ok) return [];
    const body = (await res.json()) as { pings?: IncomingPingView[] };
    return Array.isArray(body.pings) ? body.pings : [];
  } catch {
    return [];
  }
}

export async function reportRival(targetUserId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/rivals/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const SHOWN_CODES: ReadonlySet<RivalPingErrorCode> = new Set([
  'sign_in_required',
  'not_allowed',
  'blocked',
  'name_required',
  'daily_limit',
  'target_cooldown',
  'not_found',
]);

export function pingErrorKey(code: RivalPingErrorCode): string {
  if (code === 'self') return 'rivalPings.error.not_allowed';
  return `rivalPings.error.${SHOWN_CODES.has(code) ? code : 'unavailable'}`;
}
