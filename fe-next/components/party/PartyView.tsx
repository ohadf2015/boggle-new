'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { BackButton } from '@/components/ui/BackButton';
import { useRouter } from 'next/navigation';
import {
  beginTurn,
  clearParty,
  createPartyGame,
  currentPlayer,
  endTurn,
  loadParty,
  nextAfterBreakdown,
  saveParty,
  submitWord,
  type PartySetup as Setup,
  type PartyState,
} from '@/lib/party';
import { PartySetupScreen } from './PartySetup';
import { PartyHandoff } from './PartyHandoff';
import { PartyPlay } from './PartyPlay';
import { PartyRoundBreakdown } from './PartyRoundBreakdown';
import { PartyPodium } from './PartyPodium';

type Screen = 'setup' | PartyState['phase'];

export function PartyView(): ReactElement {
  const { t, language, dir } = useLanguage();
  const router = useRouter();
  const setIsInGame = useHideNavigation();
  const [saved, setSaved] = useState(false);
  const [state, setState] = useState<PartyState | null>(null);
  const [screen, setScreen] = useState<Screen>('setup');
  const stateRef = useRef<PartyState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    const existing = loadParty();
    setSaved(Boolean(existing));
  }, []);

  useEffect(() => {
    setIsInGame(screen !== 'setup');
    return () => setIsInGame(false);
  }, [screen, setIsInGame]);

  const persist = useCallback((next: PartyState) => {
    stateRef.current = next;
    setState(next);
    setScreen(next.phase);
    saveParty(next);
  }, []);

  const apply = useCallback(
    (fn: (current: PartyState) => PartyState) => {
      const current = stateRef.current;
      if (!current) return;
      persist(fn(current));
    },
    [persist],
  );

  const start = useCallback(
    (setup: Setup) => {
      persist(createPartyGame(setup));
    },
    [persist],
  );

  const resume = useCallback(() => {
    const existing = loadParty();
    if (!existing) return;
    stateRef.current = existing;
    setState(existing);
    setScreen(existing.phase);
  }, []);

  const discard = useCallback(() => {
    clearParty();
    setSaved(false);
    setState(null);
    setScreen('setup');
  }, []);

  const playAgain = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    persist(createPartyGame(current.setup));
  }, [persist]);

  return (
    <div className="min-h-screen bg-neo-navy text-neo-white" dir={dir}>
      <div className="p-3">
        <BackButton
          label={t('passAndPlay.back')}
          onClick={() => {
            if (screen === 'setup') router.push(`/${language}`);
            else discard();
          }}
        />
      </div>

      {screen === 'setup' && (
        <PartySetupScreen
          t={(key, params) => t(key, params)}
          language={language}
          saved={saved}
          onStart={start}
          onResume={resume}
          onDiscard={discard}
        />
      )}

      {state && screen === 'handoff' && (
        <PartyHandoff t={(key, params) => t(key, params)} state={state} onReady={() => apply(beginTurn)} />
      )}

      {state && screen === 'play' && (
        <PartyPlay
          t={(key, params) => t(key, params)}
          state={state}
          onSubmitWord={(word, isValid) => {
            if (!isValid) return;
            apply((s) => submitWord(s, word, () => true));
          }}
          onTimesUp={() => apply(endTurn)}
        />
      )}

      {state && screen === 'roundBreakdown' && (
        <PartyRoundBreakdown t={(key, params) => t(key, params)} state={state} onContinue={() => apply(nextAfterBreakdown)} />
      )}

      {state && screen === 'podium' && (
        <PartyPodium t={(key, params) => t(key, params)} state={state} onPlayAgain={playAgain} onNewGame={discard} />
      )}

      {state && screen !== 'setup' && (
        <p className="sr-only">
          {t('passAndPlay.yourTurn', { name: currentPlayer(state).name })}
        </p>
      )}
    </div>
  );
}

export default PartyView;
