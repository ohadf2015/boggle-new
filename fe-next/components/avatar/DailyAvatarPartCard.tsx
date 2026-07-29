'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHasRealAdProvider } from '@/hooks/useHasRealAdProvider';
import { DailyPartClaimModal } from './DailyPartClaimModal';

interface StatusResponse {
  cooldownActive: boolean;
  nextClaimAt: string | null;
  unownedCount: number;
  eligible: boolean;
}

function formatRemaining(nextClaimAt: string | null, now: number): string | null {
  if (!nextClaimAt) return null;
  const delta = new Date(nextClaimAt).getTime() - now;
  if (delta <= 0) return null;
  const hours = Math.floor(delta / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function DailyAvatarPartCard() {
  const { t } = useLanguage();
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
      const res = await fetch('/api/avatar/claim-daily-part', { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as StatusResponse;
      setStatus(json);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchStatus();
    return () => abortRef.current?.abort();
  }, [isAuthenticated, fetchStatus]);

  useEffect(() => {
    if (!status?.cooldownActive) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [status?.cooldownActive]);

  const handleClaim = useCallback(async () => {
    try {
      const res = await fetch('/api/avatar/claim-daily-part', { method: 'POST' });
      if (!res.ok) {
        setModalOpen(false);
        fetchStatus();
        return;
      }
      const json = await res.json() as { granted: string; nextClaimAt: string };
      setGranted(json.granted);
      setStatus((prev) => prev ? {
        ...prev,
        cooldownActive: true,
        nextClaimAt: json.nextClaimAt,
        unownedCount: Math.max(0, prev.unownedCount - 1),
        eligible: false,
      } : prev);
      setModalOpen(false);
    } catch {
      setModalOpen(false);
    }
  }, [fetchStatus]);

  if (!hasRealAdProvider) return null;
  if (!isAuthenticated || loading || !status) return null;

  const remaining = formatRemaining(status.nextClaimAt, now);
  const exhausted = status.unownedCount === 0;

  return (
    <>
      <button
        type="button"
        data-testid="daily-avatar-part-card"
        onClick={() => status.eligible && setModalOpen(true)}
        disabled={!status.eligible}
        className={cn(
          'mt-3 w-full flex items-center gap-3 p-3 rounded-neo text-left',
          'border-3 border-neo-black border-s-4 border-s-neo-purple',
          'bg-neo-navy/60 shadow-hard-sm transition-all duration-150',
          status.eligible && 'hover:bg-neo-navy/80 hover:-translate-y-0.5 active:translate-y-px active:shadow-hard-pressed',
          !status.eligible && 'opacity-70 cursor-not-allowed',
        )}
        aria-label={t('avatar.dailyPart.title')}
      >
        <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-purple/20">
          {granted ? (
            <Gift className="w-5 h-5 text-neo-lime" aria-hidden="true" />
          ) : (
            <Sparkles className="w-5 h-5 text-neo-purple" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-neo-body text-sm font-semibold text-neo-white truncate">
            {granted ? t('avatar.dailyPart.justClaimed') : t('avatar.dailyPart.title')}
          </p>
          <p className="font-neo-body text-xs text-neo-white truncate">
            {exhausted
              ? t('avatar.dailyPart.exhausted')
              : status.cooldownActive && remaining
                ? t('avatar.dailyPart.cooldown', { time: remaining })
                : t('avatar.dailyPart.ready')}
          </p>
        </div>
      </button>

      <DailyPartClaimModal
        isOpen={modalOpen}
        onClaim={handleClaim}
        onClose={() => setModalOpen(false)}
        t={t}
      />
    </>
  );
}

export default DailyAvatarPartCard;
