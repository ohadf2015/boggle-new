'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { MASCOT_IMAGES } from '@/components/blast/legacy/utils/blastMascot';
import { THEME_ICON, THEME_MASCOT, accentColor, getWaveTheme } from './waveTheme';
import { introDurationMs } from './progressTiming';
import { getWavePassPct } from '@/components/blast/legacy/utils/blastWaveTheme';

gsap.registerPlugin(useGSAP);

interface BlastLevelIntroProps {
  wave: number;
  durationMs?: number;
  onDone?: () => void;
}

/** One-beat themed splash so each wave announces what makes it different. */
export function BlastLevelIntro({ wave, durationMs, onDone }: BlastLevelIntroProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  const theme = getWaveTheme(wave);
  const Icon = THEME_ICON[theme.id];
  const accent = accentColor(theme);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setVisible(false);
    onDone?.();
  };

  useEffect(() => {
    const id = setTimeout(finish, durationMs ?? introDurationMs());
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one timer per mount
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap
        .timeline()
        .from('[data-intro="band"]', { scaleX: 0, duration: 0.18, ease: 'power3.out' })
        .from('[data-intro="icon"]', { scale: 0, rotate: -25, duration: 0.24, ease: 'back.out(2.2)' }, '-=0.05')
        .from('[data-intro="name"]', { scale: 1.7, autoAlpha: 0, duration: 0.22, ease: 'back.out(1.6)' }, '-=0.16')
        .from('[data-intro="goal"]', { y: 14, autoAlpha: 0, duration: 0.2, ease: 'power2.out' }, '-=0.08');
    },
    { scope: rootRef, dependencies: [reducedMotion] },
  );

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      data-testid="blast-level-intro"
      data-theme={theme.id}
      role="status"
      aria-live="polite"
      onPointerDown={finish}
      // Sits above the first-run coach card so the two never stack; the coach shows once this beat ends.
      className="fixed inset-0 z-[75] flex items-center justify-center bg-neo-navy px-4 cursor-pointer select-none"
    >
      <div
        data-intro="band"
        aria-hidden="true"
        className="absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 -skew-y-3 border-y-4 border-neo-black opacity-25 origin-center"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <span
          className="rounded-neo border-2 border-neo-black bg-neo-black px-3 py-0.5 font-neo-display text-xs font-black uppercase tracking-[0.2em]"
          style={{ color: accent }}
        >
          {t('blastProgress.wave', { wave })}
        </span>
        <div className="flex items-center gap-3">
          <span
            data-intro="icon"
            className="flex h-16 w-16 items-center justify-center rounded-neo border-3 border-neo-black text-neo-black shadow-hard-lg tv:h-24 tv:w-24"
            style={{ backgroundColor: accent }}
          >
            <Icon className="h-9 w-9 tv:h-14 tv:w-14" strokeWidth={2.75} />
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MASCOT_IMAGES[THEME_MASCOT[theme.id]]}
            alt=""
            className="h-16 w-16 rounded-neo border-3 border-neo-black object-cover shadow-hard-lg tv:h-24 tv:w-24"
          />
        </div>
        <h2
          data-intro="name"
          className="font-neo-display text-5xl font-black uppercase leading-none tracking-tight [text-shadow:3px_3px_0_var(--neo-black)] tv:text-7xl"
          style={{ color: accent }}
        >
          {t(theme.nameKey)}
        </h2>
        <p data-intro="goal" className="font-neo-display text-lg font-black uppercase text-neo-white tv:text-2xl">
          {t('blast.objective.clearPercent', { target: getWavePassPct(wave) })}
        </p>
        <p data-intro="goal" className="max-w-[18rem] font-neo-body text-sm text-neo-white/80 tv:text-lg">
          {t(theme.flavorKey)}
        </p>
        <span className="mt-2 font-neo-body text-xs text-neo-white/60">{t('blastProgress.tapToSkip')}</span>
      </div>
    </div>
  );
}
