'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMissedDailies, type MissedDailiesStatus, type MissedDaily } from '@/hooks/useMissedDailies';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { hasPlayedWordHunt, hasPlayedWordWheel } from '@/utils/dailyChallenge/storage';
import { catchUpPlayHref, type DailyPlayMode } from '@/utils/dailyChallenge/missedDayAction';
import { CATCH_UP_MODES, resolveCatchUpDays } from '@/utils/dailyChallenge/catchUpStatus';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';
import type { Language } from '@/types';

const MODE_STYLE: Record<DailyPlayMode, { emoji: string; play: string }> = {
  'word-hunt': { emoji: '🔎', play: 'bg-neo-yellow' },
  'word-wheel': { emoji: '🎡', play: 'bg-neo-pink' },
};

const settled = (s: MissedDailiesStatus) => s === 'ok' || s === 'error';
const serverList = (r: { missed: MissedDaily[]; status: MissedDailiesStatus }) =>
  r.status === 'ok' ? r.missed.map(m => m.date) : null;

/** The last 3 days, both modes each, as free play buttons with this player's played state. */
export default function CatchUpDays() {
  const { t, language } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const hunt = useMissedDailies('word-hunt', isAuthenticated, language);
  const wheel = useMissedDailies('word-wheel', isAuthenticated, language);

  // Played state lives in localStorage and the server; render nothing until both can be read.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ready = mounted && !authLoading && (!isAuthenticated || (settled(hunt.status) && settled(wheel.status)));

  if (!ready) {
    return (
      <div className="grid gap-3" aria-hidden="true" data-testid="catch-up-days-skeleton">
        {[0, 1, 2].map(i => <div key={i} className="h-32 rounded-neo skeleton" />)}
      </div>
    );
  }

  const lang = language as Language;
  const days = resolveCatchUpDays({
    today: getDailyChallengeDate(),
    playedLocally: (mode, date) => (mode === 'word-hunt' ? hasPlayedWordHunt(lang, date) : hasPlayedWordWheel(lang, date)),
    serverMissed: isAuthenticated ? { 'word-hunt': serverList(hunt), 'word-wheel': serverList(wheel) } : undefined,
  });

  return (
    <ol className="grid gap-3">
      {days.map((day, i) => {
        const allDone = CATCH_UP_MODES.every(mode => day.played[mode]);
        const dayLabel = i === 0 ? t('daily.catchUp.yesterday') : t('daily.catchUp.daysAgo', { count: i + 1 });
        return (
          <li
            key={day.date}
            className="rounded-neo border-neo-thick border-neo-black bg-neo-navy-light p-3 shadow-hard"
          >
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="font-neo-display text-lg font-black text-neo-white">
                {dayLabel}
              </h3>
              <span className="text-sm font-semibold text-neo-white/60">
                {safeToLocaleDateString(new Date(day.date + 'T00:00:00Z'), language, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
              </span>
              <bdi className="ms-auto font-neo-display text-sm font-black text-neo-cyan">#{day.puzzleNumber}</bdi>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CATCH_UP_MODES.map(mode => {
                const played = day.played[mode];
                const modeName = t(`daily.archivePage.${mode === 'word-hunt' ? 'wordHunt' : 'wordWheel'}`);
                const status = t(played ? 'daily.archivePage.done' : 'daily.archivePage.play');
                return (
                  <Link
                    key={mode}
                    href={catchUpPlayHref(language, mode, day.date)}
                    data-testid={`catch-up-${mode}-${day.date}`}
                    data-played={played}
                    aria-label={`${modeName} · ${dayLabel} · ${status}`}
                    className={`flex min-h-14 items-center gap-2 rounded-neo border-neo border-neo-black px-2.5 py-2 font-neo-display font-black shadow-hard-sm transition-transform hover:-translate-y-px active:translate-y-px active:shadow-hard-pressed ${
                      played ? 'bg-neo-navy text-neo-white/70' : `${MODE_STYLE[mode].play} text-neo-black`
                    }`}
                  >
                    <span aria-hidden className="text-lg">{MODE_STYLE[mode].emoji}</span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block text-sm [overflow-wrap:anywhere]">{modeName}</span>
                      <span className={`block text-xs ${played ? 'text-neo-lime' : 'text-neo-black/70'}`}>
                        {status}
                      </span>
                    </span>
                    {played && <Check aria-hidden className="h-5 w-5 shrink-0 text-neo-lime" strokeWidth={3} />}
                  </Link>
                );
              })}
            </div>
            {allDone && (
              <p className="mt-2 text-xs font-bold text-neo-lime">{t('daily.archivePage.allCaughtUp')}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
