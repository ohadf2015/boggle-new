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

function readLocal(): Estate {
  try {
    const raw = window.localStorage.getItem(ESTATE_STORAGE_KEY);
    return raw ? sanitizeEstate(JSON.parse(raw)) : emptyEstate();
  } catch {
    return emptyEstate();
  }
}

function writeLocal(e: Estate): void {
  try {
    window.localStorage.setItem(ESTATE_STORAGE_KEY, JSON.stringify(e));
  } catch {
    // Private mode / quota: the run still counts for this session.
  }
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function useEstate(): UseEstate {
  const { isAuthenticated, loading } = useAuth();
  const authed = !loading && isAuthenticated;
  const [status, setStatus] = useState<UseEstate['status']>('loading');
  const [estate, setEstateState] = useState<Estate>(emptyEstate);
  const [inbox, setInbox] = useState<EstateRaid[]>([]);
  const estateRef = useRef(estate);

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
    const res = await getWithAuth(API, { requireSession: true });
    const body = res.ok ? await readJson(res) : null;
    if (!body) {
      setStatus('error');
      return;
    }
    setEstate(sanitizeEstate(body.estate));
    setInbox(Array.isArray(body.raids) ? (body.raids as EstateRaid[]) : []);
    setStatus('ready');
  }, [loading, isAuthenticated, setEstate]);

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
      const res = await postWithAuth(`${API}/run`, summary, { requireSession: true, keepalive: opts?.keepalive });
      const body = res.ok ? await readJson(res) : null;
      if (!body?.estate) return null;
      setEstate(sanitizeEstate(body.estate));
      return { coins: Number(body.coins) || 0, chest: body.chest as ChestRoll };
    },
    [loading, isAuthenticated, setEstate],
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
