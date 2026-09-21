'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getWithAuth, postWithAuth } from '@/utils/authFetch';
import {
  type ChestRoll,
  type Estate,
  NEUTRAL_PERKS,
  type Perks,
  type RunSummary,
  advanceDistrict,
  applyRepair,
  applyRun,
  applyUpgrade,
  districtComplete,
  emptyEstate,
  perksFromEstate,
  sanitizeEstate,
} from '@/lib/wordTowerV2/estate';
import type { PlotSlot } from '@/lib/wordTowerV2/estateCatalog';
import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';

/**
 * The player's empire. Signed in: the server is the truth (every number is
 * recomputed there); guests: the same pure functions over localStorage.
 *
 * Auth resolves late (AuthContext starts loading + signed-out), so until it
 * settles the hook reports `status: 'loading'` with an EMPTY estate and
 * NEUTRAL perks and reads nothing — a guest estate must never flash and then
 * be replaced by the account's, and a run must never bank into the wrong one.
 */
export const ESTATE_STORAGE_KEY = 'wordTowerV2.estate';
const API = '/api/word-tower/estate';

export interface AvatarFields {
  avatarConfig: unknown;
  avatarEmoji: string | null;
  avatarColor: string | null;
  avatarImage: string | null;
}

export interface EstateRaid {
  id: string;
  attackerId: string;
  attackerName: string;
  attackerAvatar: AvatarFields | null;
  blocked: boolean;
  plot: PlotSlot | null;
  coinsStolen: number;
  revenge: boolean;
  avenged: boolean;
  createdAt: string;
}

export interface RivalView {
  /** Always pass to <Avatar userId> — without it Avatar is a skeleton forever. */
  userId: string;
  displayName: string;
  avatar: AvatarFields;
  district: number;
  plots: Estate['plots'];
  shields: number;
  bestM: number;
  lastTower: TowerBlock[];
}

export interface RevengeEntry {
  raidId: string;
  coinsStolen: number;
  blocked: boolean;
  plot: PlotSlot | null;
  createdAt: string;
  rival: RivalView;
}

export type RaidResultOutcome =
  | { kind: 'blocked'; attackerCoins: number }
  | { kind: 'damaged'; slot: PlotSlot | null; coinsStolen: number; attackerCoins: number };

export interface RaidResult {
  raidId: string | null;
  outcome: RaidResultOutcome;
  revenge: boolean;
}

export type SpendOutcome = { ok: true; districtCompleted: boolean } | { ok: false; reason: string };

export interface UseEstate {
  status: 'loading' | 'ready' | 'error';
  authed: boolean;
  estate: Estate;
  perks: Perks;
  /** Raids on me not yet marked seen (signed in only). */
  inbox: EstateRaid[];
  reportRun: (summary: RunSummary, opts?: { keepalive?: boolean }) => Promise<{ coins: number; chest: ChestRoll } | null>;
  upgrade: (slot: PlotSlot) => Promise<SpendOutcome>;
  repair: (slot: PlotSlot) => Promise<SpendOutcome>;
  /** null for guests (show the sign-in CTA). */
  rivals: () => Promise<{ rivals: RivalView[]; revenge: RevengeEntry[] } | null>;
  /** null for guests. `accuracy` 0..1 from the wreck mini-game; the server clamps it. */
  raid: (defenderId: string, accuracy: number, revenge?: boolean) => Promise<RaidResult | { error: string } | null>;
  markSeen: (ids?: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

/** Last estate the SERVER returned, per account: shown when a later read fails. */
const accountKey = (uid: string) => `${ESTATE_STORAGE_KEY}.account.${uid}`;
/** Runs the server did not bank (429 / 5xx / offline), replayed on the next load. */
const pendingKey = (uid: string) => `wordTowerV2.pendingRuns.${uid}`;
const MAX_PENDING = 5;

function readJsonKey<X>(key: string, fallback: X): X {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as X) : fallback;
  } catch {
    return fallback;
  }
}

function writeKey(key: string, value: unknown): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota: the run still counts for this session.
  }
}

const readLocal = (): Estate => sanitizeEstate(readJsonKey<unknown>(ESTATE_STORAGE_KEY, null));
const writeLocal = (e: Estate) => writeKey(ESTATE_STORAGE_KEY, e);

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function useEstate(): UseEstate {
  const { isAuthenticated, loading, user } = useAuth();
  const uid = user?.id ?? 'me';
  const authed = !loading && isAuthenticated;
  const [status, setStatus] = useState<UseEstate['status']>('loading');
  const [estate, setEstateState] = useState<Estate>(emptyEstate);
  const [inbox, setInbox] = useState<EstateRaid[]>([]);
  const estateRef = useRef(estate);
  /** Claim + replay in flight (see refresh). */
  const syncingRef = useRef(false);

  const setEstate = useCallback((e: Estate) => {
    estateRef.current = e;
    setEstateState(e);
  }, []);

  const refresh = useCallback(async () => {
    if (loading) return;
    if (!isAuthenticated) {
      setEstate(readLocal());
      setStatus('ready');
      return;
    }
    const res = await getWithAuth(API, { requireSession: true }).catch(() => null);
    const body = res?.ok ? await readJson(res) : null;
    if (!body) {
      // A failed read must not look like a wiped bank: show the last copy.
      const cached = readJsonKey<unknown>(accountKey(uid), null);
      if (cached) setEstate(sanitizeEstate(cached));
      setStatus('error');
      return;
    }
    const adopt = (raw: unknown) => {
      const e = sanitizeEstate(raw);
      setEstate(e);
      writeKey(accountKey(uid), e);
    };
    adopt(body.estate);
    setInbox(Array.isArray(body.raids) ? (body.raids as EstateRaid[]) : []);
    setStatus('ready');

    // Both steps below CREDIT coins, and neither is idempotent server-side: a
    // second refresh (the workshop re-reads on open) or a lost response must
    // never pay twice. So one at a time, and each item leaves local storage
    // BEFORE its POST — a lost response then costs that item, never doubles it.
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      // Signed-out progress follows the player into the account (claim route merges).
      const guest = readLocal();
      if (guest.runs > 0) {
        writeKey(ESTATE_STORAGE_KEY, null);
        const claim = await postWithAuth(`${API}/claim`, { estate: guest }, { requireSession: true }).catch(() => null);
        const claimed = claim?.ok ? await readJson(claim) : null;
        if (claimed?.estate) adopt(claimed.estate);
        // A definite refusal (not a lost response) is safe to try again next load.
        else if (claim && claim.status !== 400) writeLocal(guest);
      }

      // Replay runs the server refused earlier, oldest first; stop at the first failure.
      const queue = readJsonKey<RunSummary[]>(pendingKey(uid), []);
      while (queue.length) {
        const next = queue.shift()!;
        writeKey(pendingKey(uid), queue.length ? queue : null);
        const sent = await postWithAuth(`${API}/run`, next, { requireSession: true }).catch(() => null);
        const banked = sent?.ok ? await readJson(sent) : null;
        if (banked?.estate) {
          adopt(banked.estate);
          continue;
        }
        if (sent && sent.status !== 400) writeKey(pendingKey(uid), [next, ...queue]);
        break;
      }
    } finally {
      syncingRef.current = false;
    }
  }, [loading, isAuthenticated, uid, setEstate]);

  useEffect(() => {
    if (loading) {
      setStatus('loading');
      return;
    }
    void refresh().catch(() => setStatus('error'));
  }, [loading, refresh]);

  const reportRun = useCallback<UseEstate['reportRun']>(
    async (summary, opts) => {
      if (loading) return null;
      if (!isAuthenticated) {
        const r = applyRun(estateRef.current, summary, (Math.random() * 2 ** 32) >>> 0);
        setEstate(r.estate);
        writeLocal(r.estate);
        return { coins: r.coins, chest: r.chest };
      }
      // keepalive: a run banked on the way out (pagehide) must outlive the page.
      const res = await postWithAuth(`${API}/run`, summary, { requireSession: true, keepalive: opts?.keepalive }).catch(() => null);
      const body = res?.ok ? await readJson(res) : null;
      if (!body?.estate) {
        // Not banked (rate limit, 5xx, offline): keep it for the next load
        // rather than drop the coins on the floor. A 400 is a malformed run.
        if (res?.status !== 400) {
          const queue = readJsonKey<RunSummary[]>(pendingKey(uid), []);
          writeKey(pendingKey(uid), [...queue, summary].slice(-MAX_PENDING));
        }
        return null;
      }
      const e = sanitizeEstate(body.estate);
      setEstate(e);
      writeKey(accountKey(uid), e);
      return { coins: Number(body.coins) || 0, chest: body.chest as ChestRoll };
    },
    [loading, isAuthenticated, uid, setEstate],
  );

  /** Optimistic spend: apply the pure step now, then adopt the server's copy (or roll back to it). */
  const spend = useCallback(
    async (kind: 'upgrade' | 'repair', slot: PlotSlot): Promise<SpendOutcome> => {
      if (loading) return { ok: false, reason: 'loading' };
      const local = kind === 'upgrade' ? applyUpgrade(estateRef.current, slot) : applyRepair(estateRef.current, slot);
      if (!local.ok) return { ok: false, reason: local.reason };
      const completed = kind === 'upgrade' && districtComplete(local.estate);
      const optimistic = completed ? advanceDistrict(local.estate) : local.estate;
      setEstate(optimistic);
      if (!isAuthenticated) {
        writeLocal(optimistic);
        return { ok: true, districtCompleted: completed };
      }
      const res = await postWithAuth(`${API}/${kind}`, { plot: slot }, { requireSession: true });
      const body = await readJson(res);
      if (!res.ok || !body?.estate) {
        await refresh();
        return { ok: false, reason: String(body?.reason ?? 'error') };
      }
      setEstate(sanitizeEstate(body.estate));
      return { ok: true, districtCompleted: body.districtCompleted === true };
    },
    [loading, isAuthenticated, refresh, setEstate],
  );

  const upgrade = useCallback((slot: PlotSlot) => spend('upgrade', slot), [spend]);
  const repair = useCallback((slot: PlotSlot) => spend('repair', slot), [spend]);

  const rivals = useCallback<UseEstate['rivals']>(async () => {
    if (!authed) return null;
    const res = await getWithAuth(`${API}/rivals`, { requireSession: true });
    const body = res.ok ? await readJson(res) : null;
    if (!body) return { rivals: [], revenge: [] };
    return {
      rivals: (body.rivals as RivalView[]) ?? [],
      revenge: (body.revenge as RevengeEntry[]) ?? [],
    };
  }, [authed]);

  const raid = useCallback<UseEstate['raid']>(
    async (defenderId, accuracy, revenge = false) => {
      if (!authed) return null;
      const res = await postWithAuth(`${API}/raid`, { defenderId, accuracy, revenge }, { requireSession: true });
      const body = await readJson(res);
      if (!res.ok || !body?.outcome) return { error: String(body?.reason ?? 'error') };
      if (body.estate) setEstate(sanitizeEstate(body.estate));
      return { raidId: (body.raidId as string | null) ?? null, outcome: body.outcome as RaidResultOutcome, revenge };
    },
    [authed, setEstate],
  );

  const markSeen = useCallback<UseEstate['markSeen']>(
    async (ids) => {
      if (!authed) return;
      setInbox((cur) => (ids ? cur.filter((r) => !ids.includes(r.id)) : []));
      await postWithAuth(`${API}/seen`, ids ? { ids } : {}, { requireSession: true });
    },
    [authed],
  );

  const ready = status !== 'loading';
  // Stable identities: consumers put these in effect deps.
  const shown = useMemo(() => (ready ? estate : emptyEstate()), [ready, estate]);
  const perks = useMemo(() => (ready ? perksFromEstate(estate) : NEUTRAL_PERKS), [ready, estate]);
  return {
    status,
    authed,
    estate: shown,
    perks,
    inbox,
    reportRun,
    upgrade,
    repair,
    rivals,
    raid,
    markSeen,
    refresh,
  };
}
