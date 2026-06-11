'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useHasRealAdProvider } from '@/hooks/useHasRealAdProvider';

interface StatusResponse {
  cooldownActive: boolean;
  nextClaimAt: string | null;
  unownedCount: number;
  eligible: boolean;
}

export interface DailyAvatarPartState {
  /** True only when the reward can meaningfully be shown: a real ad provider
   *  exists, the user is authenticated (the claim endpoint 401s anon), and the
   *  status has loaded. Callers render null otherwise. */
  shouldRender: boolean;
  loading: boolean;
  /** Claimable right now. */
  eligible: boolean;
  /** Owns every premium part — nothing left to grant. */
  exhausted: boolean;
  cooldownActive: boolean;
  /** Human countdown to next claim, e.g. "3h 20m" (null when not on cooldown). */
  remainingLabel: string | null;
  /** Part id granted by the most recent claim this session (null until claimed). */
  granted: string | null;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  /** POST the claim. Resolves to the granted part id, or null on failure. */
  claim: () => Promise<string | null>;
}

const ENDPOINT = '/api/avatar/claim-daily-part';

function formatRemaining(nextClaimAt: string | null, now: number): string | null {
  if (!nextClaimAt) return null;
  const delta = new Date(nextClaimAt).getTime() - now;
  if (delta <= 0) return null;
  const hours = Math.floor(delta / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Owns the daily-avatar-part reward state. Single source of truth shared by the
 * missions-hub card and the lobby reward button — fetches status, ticks the
 * cooldown label, and performs the claim POST.
 */
export function useDailyAvatarPart(): DailyAvatarPartState {
  const { isAuthenticated } = useAuth();
  const hasRealAdProvider = useHasRealAdProvider();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [granted, setGranted] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const abortRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch(ENDPOINT, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as StatusResponse;
      setStatus(json);
    } catch {
      /* ignore — leave status null, treated as not-renderable */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip the round-trip entirely when nothing could ever render: no ad
    // provider (web placeholder) or an anonymous user (endpoint 401s).
    if (!hasRealAdProvider || !isAuthenticated) return;
    fetchStatus();
    return () => abortRef.current?.abort();
  }, [hasRealAdProvider, isAuthenticated, fetchStatus]);

  useEffect(() => {
    if (!status?.cooldownActive) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [status?.cooldownActive]);

  const claim = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(ENDPOINT, { method: 'POST' });
      if (!res.ok) {
        setModalOpen(false);
        fetchStatus();
        return null;
      }
      const json = (await res.json()) as { granted: string; nextClaimAt: string };
      setGranted(json.granted);
      setStatus((prev) => prev ? {
        ...prev,
        cooldownActive: true,
        nextClaimAt: json.nextClaimAt,
        unownedCount: Math.max(0, prev.unownedCount - 1),
        eligible: false,
      } : prev);
      setModalOpen(false);
      return json.granted;
    } catch {
      setModalOpen(false);
      return null;
    }
  }, [fetchStatus]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const shouldRender = hasRealAdProvider && isAuthenticated && !loading && !!status;
  const remainingLabel = useMemo(
    () => formatRemaining(status?.nextClaimAt ?? null, now),
    [status?.nextClaimAt, now],
  );

  return {
    shouldRender,
    loading,
    eligible: !!status?.eligible,
    exhausted: status?.unownedCount === 0,
    cooldownActive: !!status?.cooldownActive,
    remainingLabel,
    granted,
    modalOpen,
    openModal,
    closeModal,
    claim,
  };
}

export default useDailyAvatarPart;
