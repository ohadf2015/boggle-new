'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import type { SupportedLocale } from '@/lib/word-craft/tileBag';
import { useCascadeRun } from '@/lib/word-craft/cascade/useCascadeRun';
import { CascadeBoard } from '@/components/word-craft/cascade/CascadeBoard';
import { CascadeHUD } from '@/components/word-craft/cascade/CascadeHUD';
import { CardPickScreen } from '@/components/word-craft/run/CardPickScreen';
import { RoundResultScene } from '@/components/word-craft/run/RoundResultScene';
import { RunResultScene } from '@/components/word-craft/run/RunResultScene';

export function CascadePageClient() {
  const { t, language } = useLanguage();
  const locale = (language ?? 'en') as SupportedLocale;
  useHideNavigation();

  const [dict, setDict] = useState<Set<string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadWordCraftDictionary(locale)
      .then((d) => {
        if (!cancelled) setDict(d);
      })
      .catch(() => {
        if (!cancelled) setDict(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Cascade boards stay smaller than rack mode; 7×7 on phones, 9×9 on tablets+
  const boardSize: 7 | 9 =
    typeof window !== 'undefined' && window.innerWidth >= 768 ? 9 : 7;

  const run = useCascadeRun({ seed: 1, dict, locale, boardSize });
  const { state } = run;

  if (!dict) {
    return (
      <div className="p-6 text-center font-neo-body text-neo-white/70">
        {t('common.loading')}
      </div>
    );
  }

  if (state.phase === 'intro') {
    return (
      <section className="flex flex-col items-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-neo-display text-neo-lime">
          {t('wordcraft.cascade.intro.title', {
            defaultValue: t('wordcraft.run.intro.title'),
          })}
        </h1>
        <p className="max-w-md font-neo-body text-neo-white/80">
          {t('wordcraft.cascade.intro.howTo', {
            defaultValue:
              'Swipe a path through adjacent letters to spell a word. Burn tiles, trigger cascades, and outrun the fire row.',
          })}
        </p>
        <button
          type="button"
          onClick={run.startRun}
          className="animate-neo-press rounded-neo border-neo-thick border-neo-lime bg-neo-lime px-6 py-2 font-neo-display text-neo-navy shadow-hard"
        >
          {t('wordcraft.cascade.intro.start', {
            defaultValue: t('wordcraft.run.intro.start'),
          })}
        </button>
      </section>
    );
  }

  if (state.phase === 'cardPick' && state.cardChoice) {
    return <CardPickScreen cards={state.cardChoice} onPick={run.pickCard} />;
  }

  if (state.phase === 'roundResult') {
    return (
      <RoundResultScene
        passed={state.roundPassed}
        round={state.round.round}
        roundScore={state.round.score}
        target={state.round.target}
        onProceed={run.proceed}
      />
    );
  }

  if (state.phase === 'runResult') {
    return (
      <RunResultScene
        cleared={state.cleared}
        runTotal={state.runTotal}
        activeCards={state.activeCards}
        onRestart={run.restart}
      />
    );
  }

  // playing
  const burnedIds = state.lastSubmit?.burnedCellIds ?? [];
  return (
    <div className="flex flex-col gap-3 p-3">
      <CascadeHUD
        round={state.round.round}
        target={state.round.target}
        score={state.round.score}
        runTotal={state.runTotal}
        activeCards={state.activeCards}
        fireRow={state.fire.fireRow}
        fireTotalRows={state.fire.totalRows}
        comboCount={state.cascadeChainsThisRound}
      />
      <CascadeBoard
        grid={state.grid}
        diagonal={state.activeCards.some((c) => c.id === 'diagonal')}
        onSubmitPath={run.submitPath}
        recentlyBurnedIds={burnedIds}
        fireRow={state.fire.fireRow}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={run.endRound}
          className="animate-neo-press rounded-neo border-neo border-neo-pink bg-neo-navy-light px-4 py-2 font-neo-body text-neo-pink shadow-hard"
        >
          {t('wordcraft.cascade.endRound', {
            defaultValue: t('wordcraft.run.endRound'),
          })}
        </button>
        {state.lastSubmit && (
          <p
            data-testid="cascade-last-submit"
            className="font-neo-body text-sm text-neo-cream"
          >
            {state.lastSubmit.word}{' '}
            <span className="text-neo-lime">+{state.lastSubmit.totalScore}</span>
          </p>
        )}
      </div>
      {state.lastError && (
        <p className="font-neo-body text-sm text-neo-red">
          {t(`wordcraft.cascade.error.${state.lastError}`, {
            defaultValue: state.lastError,
          })}
        </p>
      )}
    </div>
  );
}
