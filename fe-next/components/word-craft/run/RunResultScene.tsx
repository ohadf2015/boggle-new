'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PowerCard } from '@/lib/word-craft/run/powerCards';

interface RunResultSceneProps {
  cleared: boolean;
  runTotal: number;
  activeCards: PowerCard[];
  onRestart: () => void;
}

export function RunResultScene({ cleared, runTotal, activeCards, onRestart }: RunResultSceneProps) {
  const { t } = useLanguage();
  const scoreRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!scoreRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const counter = { val: 0 };
    const tween = gsap.to(counter, {
      val: runTotal,
      duration: 0.8,
      delay: 0.2,
      ease: 'power2.out',
      onUpdate: () => {
        if (scoreRef.current) scoreRef.current.textContent = String(Math.round(counter.val));
      },
    });
    return () => {
      tween.kill();
    };
  }, [runTotal]);

  return (
    <section className="flex flex-col items-center gap-4 p-6 text-center">
      <h2 className={`text-3xl font-neo-display ${cleared ? 'text-neo-lime' : 'text-neo-red'}`}>
        {t(cleared ? 'wordcraft.run.runResult.cleared' : 'wordcraft.run.runResult.failed')}
      </h2>
      <p className="font-neo-body text-neo-white">{t('wordcraft.run.runResult.total')}</p>
      <p ref={scoreRef} className="text-5xl font-neo-display text-neo-yellow tabular-nums">{runTotal}</p>
      {activeCards.length > 0 && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-neo-body text-neo-white">
            {t('wordcraft.run.runResult.cardsTaken')}
          </span>
          <div className="flex flex-wrap justify-center gap-1">
            {activeCards.map((c) => (
              <span
                key={c.id}
                className="rounded-neo border-neo bg-neo-navy-light px-2 py-0.5 text-xs font-neo-body text-neo-cyan"
              >
                {t(`wordcraft.run.card.${c.id}.name`)}
              </span>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onRestart}
        className="animate-neo-press rounded-neo border-neo-thick border-neo-lime bg-neo-lime px-6 py-2 font-neo-display text-neo-navy shadow-hard"
      >
        {t('wordcraft.run.restart')}
      </button>
    </section>
  );
}
