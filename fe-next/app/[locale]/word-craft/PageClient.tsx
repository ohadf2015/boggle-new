'use client';

import { useCallback, useState } from 'react';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseDuel } from '@/lib/word-craft/duel';
import { WordCraftSetup } from '@/components/word-craft/WordCraftSetup';
import { WordCraftGameView } from '@/components/word-craft/WordCraftGameScreen';
import { loadSetupPrefs, saveSetupPrefs, type WordCraftSetupChoice } from '@/lib/word-craft/setupPrefs';
import { trackWordCraftSetupStart } from '@/components/word-craft/wordCraftTelemetry';
import { cn } from '@/lib/utils';

type WordCraftPhase = { name: 'setup' } | { name: 'playing'; choice: WordCraftSetupChoice };

/**
 * Decide whether the visit needs the setup screen. Pure so it's unit-testable:
 *  - duel link → straight to play (the challenger's contract locks everything)
 *  - ?vs=human deep link → straight to hotseat play
 *  - ?quick=1 → straight to play with the persisted prefs
 *  - otherwise → setup screen
 */
export function resolveInitialWordCraftPhase(
  searchParams: URLSearchParams,
  hasDuel: boolean,
  prefs: WordCraftSetupChoice,
): WordCraftPhase {
  if (hasDuel) return { name: 'playing', choice: { ...prefs, opponent: 'bot' } };
  if (searchParams.get('vs') === 'human') return { name: 'playing', choice: { ...prefs, opponent: 'hotseat' } };
  if (searchParams.get('quick') === '1') return { name: 'playing', choice: prefs };
  return { name: 'setup' };
}

/**
 * Thin phase switcher: setup screen first (opponent / difficulty / twist),
 * then the game view. Deep links (duel, ?vs=human, ?quick=1) skip setup.
 * The game view remounts per START via key so a fresh choice deals a fresh
 * game (useReducer init is one-shot).
 */
export default function WordCraftPageClient() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  // Parsed once (lazy state init) — duels and deep links never change within
  // a visit, and the random fallback seed must not re-roll on re-render.
  const [{ duel, seed }] = useState(() => {
    if (typeof window === 'undefined') return { duel: null as ReturnType<typeof parseDuel>, seed: 1 };
    const params = new URLSearchParams(window.location.search);
    const parsedDuel = parseDuel(params);
    const fromUrl = params.get('seed');
    const parsedSeed = parsedDuel
      ? parsedDuel.seed
      : fromUrl
        ? Number(fromUrl)
        : Math.floor(Math.random() * 1_000_000);
    return { duel: parsedDuel, seed: parsedSeed };
  });

  const [phase, setPhase] = useState<WordCraftPhase>(() => {
    if (typeof window === 'undefined') return { name: 'setup' };
    return resolveInitialWordCraftPhase(new URLSearchParams(window.location.search), !!duel, loadSetupPrefs());
  });
  // Bumped on every START so the game view (and its one-shot reducer init)
  // remounts with the fresh choice.
  const [gameInstance, setGameInstance] = useState(0);

  const startGame = useCallback((choice: WordCraftSetupChoice) => {
    saveSetupPrefs(choice);
    trackWordCraftSetupStart({ opponent: choice.opponent, difficulty: choice.difficulty, modifier: choice.modifier });
    setGameInstance((n) => n + 1);
    setPhase({ name: 'playing', choice });
  }, []);

  if (phase.name === 'setup') {
    return (
      <div
        className={cn('flex flex-col w-full h-svh overflow-hidden relative bg-neo-navy texture-halftone', isRTL && 'rtl')}
        translate="no"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[220px] bg-gradient-to-b from-neo-purple/20 via-neo-pink/8 to-transparent"
        />
        <Header />
        <h1 className="sr-only">{t('wordcraft.title')}</h1>
        <WordCraftSetup initial={loadSetupPrefs()} onStart={startGame} t={t} />
      </div>
    );
  }

  return (
    <WordCraftGameView
      key={gameInstance}
      seed={seed}
      duel={duel}
      hotseat={phase.choice.opponent === 'hotseat'}
      difficulty={phase.choice.difficulty}
      modifierOverride={phase.choice.modifier === 'surprise' ? undefined : phase.choice.modifier}
    />
  );
}
