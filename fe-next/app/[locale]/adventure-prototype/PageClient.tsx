'use client';

import { useState, useCallback, useEffect } from 'react';
import { BattleSceneRoot } from '@/components/adventure/v2/BattleSceneRoot';
import { BetweenFightsScreen, RunCompleteScreen, type FightOutcome } from '@/components/adventure/v2/RunScreens';
import { UpgradePicker } from '@/components/adventure/v2/UpgradePicker';
import { useCombatStore } from '@/lib/adventure/v2/state/runStore';
import { loadHeDict, isHeDictLoaded } from '@/lib/adventure/v2/engine/__protoDictHe';
import { pickRandomUpgradeChoices, type UpgradeId } from '@/lib/adventure/v2/upgrades';
import type { Locale } from '@/lib/adventure/v2/types';

interface PageClientProps {
  locale: Locale;
}

const FIGHT_COUNT = 3;

type RunStatus = 'pre-fight' | 'fighting' | 'between' | 'run-victory' | 'run-defeat';

interface RunState {
  fightIndex: number;
  outcomes: FightOutcome[];
  status: RunStatus;
  equipped: UpgradeId[];
  pickerChoices: UpgradeId[];
}

function makeInitialRun(): RunState {
  return {
    fightIndex: 0,
    outcomes: [],
    status: 'pre-fight',
    equipped: [],
    pickerChoices: pickRandomUpgradeChoices([], 3),
  };
}

export function PageClient({ locale }: PageClientProps) {
  const [run, setRun] = useState<RunState>(makeInitialRun);
  const [resetKey, setResetKey] = useState(0);
  const [dictReady, setDictReady] = useState(locale !== 'he' || isHeDictLoaded());
  const [dictError, setDictError] = useState<string | null>(null);

  useEffect(() => {
    if (locale !== 'he' || dictReady) return;
    let alive = true;
    loadHeDict()
      .then(() => {
        if (alive) setDictReady(true);
      })
      .catch((err: unknown) => {
        if (alive) setDictError(err instanceof Error ? err.message : 'failed to load dict');
      });
    return () => {
      alive = false;
    };
  }, [locale, dictReady]);

  const onVictory = useCallback(() => {
    setRun((s) => {
      const isLast = s.fightIndex >= FIGHT_COUNT - 1;
      if (isLast) {
        return {
          ...s,
          outcomes: [...s.outcomes, 'win'],
          status: 'run-victory',
        };
      }
      return {
        ...s,
        outcomes: [...s.outcomes, 'win'],
        status: 'between',
      };
    });
  }, []);

  const onDefeat = useCallback(() => {
    setRun((s) => ({
      ...s,
      outcomes: [...s.outcomes, 'loss'],
      status: 'run-defeat',
    }));
  }, []);

  const startFight = useCallback(
    (equipped: UpgradeId[]) => {
      setResetKey((k) => k + 1);
      useCombatStore.getState().startNewBattle(locale, equipped);
      useCombatStore.getState().dispatch({ type: 'START_TURN' });
    },
    [locale],
  );

  const continueFromBetween = useCallback(() => {
    // Transition from victory-summary to upgrade picker
    setRun((s) => ({
      ...s,
      status: 'pre-fight',
      pickerChoices: pickRandomUpgradeChoices(s.equipped, 3),
    }));
  }, []);

  const onUpgradePicked = useCallback(
    (id: UpgradeId) => {
      setRun((s) => {
        const nextEquipped = [...s.equipped, id];
        const nextFightIndex = s.outcomes.length; // 0 before fight 1, 1 between fight 1 & 2, etc.
        // Start the next fight immediately
        setTimeout(() => startFight(nextEquipped), 0);
        return {
          ...s,
          equipped: nextEquipped,
          fightIndex: nextFightIndex,
          status: 'fighting',
          pickerChoices: [],
        };
      });
    },
    [startFight],
  );

  const startNewRun = useCallback(() => {
    const init = makeInitialRun();
    setRun(init);
    // Don't start the fight yet; wait for upgrade pick
  }, []);

  const isHe = locale === 'he';

  return (
    <main
      style={{
        background: '#0a0a14',
        minHeight: '100vh',
        padding: 16,
        fontFamily: 'Fredoka, Rubik, sans-serif',
      }}
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <h1
        style={{
          color: '#bfff00',
          fontSize: 24,
          textAlign: 'center',
          marginBottom: 8,
          textShadow: '2px 2px 0 #000',
        }}
      >
        {isHe ? 'אדוונצ\'ר פרוטוטייפ' : 'Adventure Prototype'}
        <span style={{ marginInlineStart: 12, fontSize: 14, opacity: 0.6 }}>
          [{locale}] {isHe ? `קרב ${run.fightIndex + 1}/${FIGHT_COUNT}` : `Fight ${run.fightIndex + 1}/${FIGHT_COUNT}`}
        </span>
      </h1>
      <p
        style={{
          color: '#888',
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 16,
          fontFamily: 'Rubik, sans-serif',
        }}
      >
        {isHe
          ? 'הקש על אריחים או הקלד אותיות · Enter כדי לכשף · Backspace לבטל'
          : 'Tap tiles or type letters · Enter to cast · Backspace to undo'}
      </p>

      {dictError && (
        <p style={{ color: '#ef4444', textAlign: 'center', fontFamily: 'Rubik, sans-serif' }}>
          Dictionary load error: {dictError}
        </p>
      )}

      {!dictReady ? (
        <p
          style={{
            color: '#bfff00',
            textAlign: 'center',
            fontSize: 18,
            padding: 80,
            fontFamily: 'Rubik, sans-serif',
          }}
        >
          {isHe ? 'טוען מילון…' : 'Loading dictionary…'}
        </p>
      ) : (
        <BattleSceneRoot
          key={resetKey}
          onVictory={onVictory}
          onDefeat={onDefeat}
          locale={locale}
        />
      )}

      {run.status === 'pre-fight' && dictReady && (
        <UpgradePicker
          choices={run.pickerChoices}
          isHe={isHe}
          fightIndex={run.fightIndex}
          fightCount={FIGHT_COUNT}
          onPick={onUpgradePicked}
          equippedSoFar={run.equipped}
        />
      )}
      {run.status === 'between' && (
        <BetweenFightsScreen
          fightIndex={run.fightIndex}
          fightCount={FIGHT_COUNT}
          outcomes={run.outcomes}
          isHe={isHe}
          onContinue={continueFromBetween}
        />
      )}
      {run.status === 'run-victory' && (
        <RunCompleteScreen
          outcome="victory"
          outcomes={run.outcomes}
          fightCount={FIGHT_COUNT}
          isHe={isHe}
          onNewRun={startNewRun}
        />
      )}
      {run.status === 'run-defeat' && (
        <RunCompleteScreen
          outcome="defeat"
          outcomes={run.outcomes}
          fightCount={FIGHT_COUNT}
          isHe={isHe}
          onNewRun={startNewRun}
        />
      )}
    </main>
  );
}
