'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { parseDuel } from '@/lib/word-craft/duel';
import { WordCraftSetup } from '@/components/word-craft/WordCraftSetup';
import { WordCraftGameView } from '@/components/word-craft/WordCraftGameScreen';
import { hasStoredSetupPrefs, loadSetupPrefs, saveSetupPrefs, type WordCraftSetupChoice } from '@/lib/word-craft/setupPrefs';
import {
  trackWordCraftQuickResumeStart,
  trackWordCraftSetupShown,
  trackWordCraftSetupStart,
} from '@/components/word-craft/wordCraftTelemetry';
import { useExperiment } from '@/hooks/useExperiment';
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

  // exp-wordcraft-quick-resume-v1: seeded synchronously from a cookie for a
  // user already bucketed on a prior visit, so this is safe to read inside
  // the lazy `phase` initializer below (unassigned users fall back to
  // 'control' — the same always-show-setup behaviour as today).
  const { variant: quickResumeVariant, trackExposure: trackQuickResumeExposure } =
    useExperiment('exp-wordcraft-quick-resume-v1');
  useEffect(() => {
    trackQuickResumeExposure();
  }, [trackQuickResumeExposure]);

  // Hide the global bottom nav for BOTH phases (setup + game): the page is a
  // no-scroll h-svh surface, and the nav would overlap the setup footer.
  // Owned here (not in the game view) so START's remount can't flicker it.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

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

  // Set inside the `phase` lazy initializer below when the quick-resume arm
  // auto-skips setup, so the telemetry effect can fire the right event
  // exactly once per mount without re-deriving the decision.
  const quickResumedRef = useRef(false);

  const [phase, setPhase] = useState<WordCraftPhase>(() => {
    if (typeof window === 'undefined') return { name: 'setup' };
    const params = new URLSearchParams(window.location.search);
    const resolved = resolveInitialWordCraftPhase(params, !!duel, loadSetupPrefs());
    if (
      resolved.name === 'setup' &&
      quickResumeVariant === 'quick-resume' &&
      hasStoredSetupPrefs()
    ) {
      quickResumedRef.current = true;
      return { name: 'playing', choice: loadSetupPrefs() };
    }
    return resolved;
  });
  useEffect(() => {
    if (phase.name === 'setup') {
      trackWordCraftSetupShown();
    } else if (quickResumedRef.current) {
      trackWordCraftQuickResumeStart({
        opponent: phase.choice.opponent,
        difficulty: phase.choice.difficulty,
        modifier: phase.choice.modifier,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once for the initial phase only, not on later setPhase(playing) via startGame
  }, []);
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
      challengeIntent={phase.choice.opponent === 'friend'}
      difficulty={phase.choice.difficulty}
      modifierOverride={phase.choice.modifier === 'surprise' ? undefined : phase.choice.modifier}
    />
  );
}
