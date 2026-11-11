'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { StreakMascotAct } from './StreakMascotAct';

const LOCALES: Record<string, string> = { he: 'he-IL', ja: 'ja-JP', sv: 'sv-SE', es: 'es-ES', ru: 'ru-RU' };

function dayName(isoDate: string, language: string): string {
  try {
    return new Date(isoDate + 'T00:00:00Z').toLocaleDateString(LOCALES[language] || 'en-US', { weekday: 'long', timeZone: 'UTC' });
  } catch {
    return isoDate;
  }
}

interface StreakSavedMomentProps {
  saved: { date: string; freezesRemaining: number };
  onDismiss: () => void;
}

/** The mascot shakes free of an ice cube: the freeze took the hit, the streak kept going. */
export function StreakSavedMoment({ saved, onDismiss }: StreakSavedMomentProps) {
  const { t, language } = useLanguage();
  const [reducedEffects] = useReducedEffects();

  return (
    <button
      type="button"
      role="status"
      aria-live="polite"
      data-testid="streak-saved-moment"
      onClick={onDismiss}
      style={{ bottom: 'calc(var(--bottom-nav-height, 0px) + 16px)' }}
      className={`fixed left-1/2 z-50 flex w-[min(92vw,380px)] -translate-x-1/2 items-center gap-3 rounded-neo border-[3px] border-neo-black bg-neo-navy-light px-3 py-2.5 text-start shadow-hard-lg ${
        reducedEffects ? '' : 'animate-in slide-in-from-bottom-4 duration-300'
      }`}
    >
      <StreakMascotAct act="iceBreak" src="/mascot/bridge-cheer-nobg.webp" size={64} className="shrink-0" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-neo-display text-base font-black leading-tight text-neo-cyan">{t('dailyStreak.freezeUsed')}</span>
        <span className="font-neo-body text-xs font-semibold text-neo-white/80">
          {t('dailyStreak.streak_freeze_toast_message', { day: dayName(saved.date, language), remaining: saved.freezesRemaining })}
        </span>
      </span>
    </button>
  );
}

export default StreakSavedMoment;
