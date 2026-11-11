'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIncomingRivalPings } from '@/hooks/useIncomingRivalPings';
import posthog from '@/lib/analytics/lazyPosthog';
import { useInGameSurface } from '@/lib/inGameSurface';
import { surfaceOf } from '@/lib/navigation/eduSections';
import { pingErrorKey, sendRivalPing } from '@/lib/rivals/pingClient';
import { RIVAL_PINGS, type RivalPingErrorCode, type RivalPingId } from '@/lib/rivals/pings';
import { markNotificationRead } from '@/lib/supabaseRealtimeNotifications';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { RivalPingPicker } from './RivalPingPicker';

const action =
  'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border-2 border-neo-black px-3 font-black text-neo-black shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';

/** One rival ping at a time, held while a round is on screen and never on classroom pages. */
export function IncomingPingToast() {
  const { t, language } = useLanguage();
  const pathname = usePathname();
  const inGame = useInGameSurface();
  const { queue, dismiss } = useIncomingRivalPings();
  const [replying, setReplying] = useState(false);
  const [refusal, setRefusal] = useState<RivalPingErrorCode | null>(null);
  const viewed = useRef(new Set<string>());

  const paused = inGame || surfaceOf(pathname) === 'edu';
  const current = paused ? null : queue[0] ?? null;

  useEffect(() => {
    if (!current || viewed.current.has(current.id)) return;
    viewed.current.add(current.id);
    void markNotificationRead(current.id);
    posthog.capture('rival_ping_received_viewed', { pingId: current.pingId });
  }, [current]);

  useEffect(() => {
    setReplying(false);
    setRefusal(null);
  }, [current?.id]);

  if (!current) return null;
  const ping = RIVAL_PINGS[current.pingId];

  const reply = async (pingId: RivalPingId) => {
    const result = await sendRivalPing(current.sender.id, pingId, 'reply');
    if (result.ok) {
      posthog.capture('rival_ping_sent', { pingId, context: 'reply' });
      dismiss(current.id);
      return;
    }
    setReplying(false);
    setRefusal(result.code);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t('rivalPings.toast.region')}
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-4 pt-[max(env(safe-area-inset-top),0.75rem)]"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border-[3px] border-neo-black bg-neo-yellow p-3 shadow-hard-lg">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-full border-2 border-neo-black bg-neo-white">
            <Avatar
              customAvatar={(current.sender.avatar.config as CustomAvatarConfig | null) ?? null}
              userId={current.sender.id}
              size="sm"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-neo-black">{t('rivalPings.toast.title', { name: current.sender.name })}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-base font-bold text-neo-black">
              <span aria-hidden="true" className="text-2xl leading-none">{ping.emoji}</span>
              <span>{t(ping.textKey)}</span>
            </p>
          </div>
          <button
            type="button"
            aria-label={t('rivalPings.toast.close')}
            onClick={() => dismiss(current.id)}
            className="-me-1 -mt-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-xl font-black text-neo-black"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {refusal && (
          <p role="alert" className="mt-2 text-sm font-bold text-neo-black">
            {t(pingErrorKey(refusal))}
          </p>
        )}

        {replying ? (
          <div className="mt-3 rounded-xl border-2 border-neo-black bg-neo-white p-2">
            <RivalPingPicker onPick={reply} />
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setReplying(true)} className={`${action} bg-neo-pink`}>
              {t('rivalPings.toast.pingBack')}
            </button>
            <Link
              href={`/${language}/player/${encodeURIComponent(current.sender.id)}`}
              onClick={() => dismiss(current.id)}
              className={`${action} bg-neo-lime`}
            >
              {t('rivalPings.toast.play')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default IncomingPingToast;
