'use client';

import { useState, useCallback, useEffect } from 'react';
import { BattleSceneRoot } from '@/components/adventure/v2/BattleSceneRoot';
import { BetweenFightsScreen, RunCompleteScreen, type FightOutcome } from '@/components/adventure/v2/RunScreens';
import { UpgradePicker } from '@/components/adventure/v2/UpgradePicker';
import { TreasureRoom, CampRoom, BossIntroScreen } from '@/components/adventure/v2/RoomScreens';
import { useCombatStore } from '@/lib/adventure/v2/state/runStore';
import { loadHeDict, isHeDictLoaded } from '@/lib/adventure/v2/engine/__protoDictHe';
import { pickRandomUpgradeChoices, type UpgradeId } from '@/lib/adventure/v2/upgrades';
import type { Locale } from '@/lib/adventure/v2/types';

interface PageClientProps {
  locale: Locale;
}

// Run sequence: combat → treasure → combat → camp → BOSS
type RoomKind = 'combat' | 'treasure' | 'camp' | 'boss';
const RUN_SEQUENCE: RoomKind[] = ['combat', 'treasure', 'combat', 'camp', 'boss'];
const COMBAT_COUNT = RUN_SEQUENCE.filter((r) => r === 'combat' || r === 'boss').length; // 3

type RunStatus =
  | 'pre-fight' // upgrade picker before a combat
  | 'fighting'
  | 'between' // post-victory summary
  | 'treasure'
  | 'camp'
  | 'boss-intro'
  | 'run-victory'
  | 'run-defeat';

interface RunState {
  roomIndex: number; // index into RUN_SEQUENCE
  outcomes: FightOutcome[];
  status: RunStatus;
  equipped: UpgradeId[];
  pickerChoices: UpgradeId[];
}

function makeInitialRun(): RunState {
  return {
    roomIndex: 0,
    outcomes: [],
    status: 'pre-fight',
    equipped: [],
    pickerChoices: pickRandomUpgradeChoices([], 3),
  };
}

function combatNumber(roomIndex: number): number {
  // Count combats / boss up to and including this room
  return RUN_SEQUENCE.slice(0, roomIndex + 1).filter(
    (r) => r === 'combat' || r === 'boss',
  ).length;
}

function isBossNext(run: RunState): boolean {
  return RUN_SEQUENCE[run.roomIndex] === 'boss';
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

  const startFight = useCallback(
    (equipped: UpgradeId[], isBoss: boolean) => {
      setResetKey((k) => k + 1);
      useCombatStore.getState().startNewBattle(locale, equipped);
      // Boss buff: +60% enemy HP
      if (isBoss) {
        const s = useCombatStore.getState();
        useCombatStore.setState({
          enemyMaxHp: Math.floor(s.enemyMaxHp * 1.6),
          enemyHp: Math.floor(s.enemyMaxHp * 1.6),
        });
      }
      useCombatStore.getState().dispatch({ type: 'START_TURN' });
    },
    [locale],
  );

  const advanceToNextRoom = useCallback(
    (newRun: RunState) => {
      const nextIdx = newRun.roomIndex + 1;
      if (nextIdx >= RUN_SEQUENCE.length) {
        setRun({ ...newRun, status: 'run-victory' });
        return;
      }
      const nextKind = RUN_SEQUENCE[nextIdx];
      const updated: RunState = { ...newRun, roomIndex: nextIdx };
      if (nextKind === 'combat') {
        updated.status = 'pre-fight';
        updated.pickerChoices = pickRandomUpgradeChoices(updated.equipped, 3);
      } else if (nextKind === 'treasure') {
        updated.status = 'treasure';
      } else if (nextKind === 'camp') {
        updated.status = 'camp';
      } else if (nextKind === 'boss') {
        updated.status = 'boss-intro';
      }
      setRun(updated);
    },
    [],
  );

  const onVictory = useCallback(() => {
    setRun((s) => ({
      ...s,
      outcomes: [...s.outcomes, 'win'],
      status: 'between',
    }));
  }, []);

  const onDefeat = useCallback(() => {
    setRun((s) => ({
      ...s,
      outcomes: [...s.outcomes, 'loss'],
      status: 'run-defeat',
    }));
  }, []);

  const continueFromBetween = useCallback(() => {
    setRun((s) => {
      // Advance to next room
      advanceToNextRoom(s);
      return s;
    });
  }, [advanceToNextRoom]);

  const onUpgradePicked = useCallback(
    (id: UpgradeId) => {
      setRun((s) => {
        const nextEquipped = [...s.equipped, id];
        const isBoss = RUN_SEQUENCE[s.roomIndex] === 'boss';
        setTimeout(() => startFight(nextEquipped, isBoss), 0);
        return {
          ...s,
          equipped: nextEquipped,
          status: 'fighting',
          pickerChoices: [],
        };
      });
    },
    [startFight],
  );

  const onTreasurePick = useCallback(
    (id: 'heal' | 'maxHpUp' | 'randomUpgrade') => {
      const store = useCombatStore.getState();
      if (id === 'heal') {
        store.applyHeroHeal(Math.floor(store.heroMaxHp * 0.5));
      } else if (id === 'maxHpUp') {
        store.bumpMaxHp(5, true);
      } else if (id === 'randomUpgrade') {
        const choices = pickRandomUpgradeChoices(run.equipped, 1);
        if (choices.length > 0) {
          const newId = choices[0];
          setRun((s) => ({ ...s, equipped: [...s.equipped, newId] }));
          store.addUpgrade(newId);
        }
      }
      setRun((s) => {
        advanceToNextRoom(s);
        return s;
      });
    },
    [advanceToNextRoom, run.equipped],
  );

  const onCampContinue = useCallback(() => {
    const store = useCombatStore.getState();
    store.applyHeroHeal(store.heroMaxHp); // full heal
    setRun((s) => {
      advanceToNextRoom(s);
      return s;
    });
  }, [advanceToNextRoom]);

  const onBossIntroContinue = useCallback(() => {
    setRun((s) => {
      setTimeout(() => startFight(s.equipped, true), 0);
      return { ...s, status: 'fighting' };
    });
  }, [startFight]);

  const startNewRun = useCallback(() => {
    const init = makeInitialRun();
    setRun(init);
  }, []);

  const isHe = locale === 'he';
  const currentCombatNum = combatNumber(run.roomIndex);

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
          [{locale}]{' '}
          {isHe
            ? `קרב ${currentCombatNum}/${COMBAT_COUNT}`
            : `Combat ${currentCombatNum}/${COMBAT_COUNT}`}
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
          ? 'גרור אותיות סמוכות · שחרר כדי לכשף'
          : 'Drag adjacent tiles · release to cast'}
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
          isBoss={RUN_SEQUENCE[run.roomIndex] === 'boss'}
          enemyName={RUN_SEQUENCE[run.roomIndex] === 'boss' ? 'THE PRESSURE' : 'ENEMY'}
          enemyNameHe={RUN_SEQUENCE[run.roomIndex] === 'boss' ? 'הלחץ' : 'אויב'}
        />
      )}

      {run.status === 'pre-fight' && dictReady && (
        <UpgradePicker
          choices={run.pickerChoices}
          isHe={isHe}
          fightIndex={currentCombatNum - 1}
          fightCount={COMBAT_COUNT}
          onPick={onUpgradePicked}
          equippedSoFar={run.equipped}
        />
      )}
      {run.status === 'between' && (
        <BetweenFightsScreen
          fightIndex={currentCombatNum - 1}
          fightCount={COMBAT_COUNT}
          outcomes={run.outcomes}
          isHe={isHe}
          onContinue={continueFromBetween}
        />
      )}
      {run.status === 'treasure' && (
        <TreasureRoom isHe={isHe} onPick={onTreasurePick} onContinue={() => {}} />
      )}
      {run.status === 'camp' && <CampRoom isHe={isHe} onContinue={onCampContinue} />}
      {run.status === 'boss-intro' && (
        <BossIntroScreen
          isHe={isHe}
          onContinue={onBossIntroContinue}
          bossName="THE PRESSURE"
          bossNameHe="הלחץ"
          bossSubtitle="Faster reveals. More HP. Bring your build."
          bossSubtitleHe="חשיפה מהירה יותר. יותר בריאות. הביא את הבנייה שלך."
        />
      )}
      {run.status === 'run-victory' && (
        <RunCompleteScreen
          outcome="victory"
          outcomes={run.outcomes}
          fightCount={COMBAT_COUNT}
          isHe={isHe}
          onNewRun={startNewRun}
        />
      )}
      {run.status === 'run-defeat' && (
        <RunCompleteScreen
          outcome="defeat"
          outcomes={run.outcomes}
          fightCount={COMBAT_COUNT}
          isHe={isHe}
          onNewRun={startNewRun}
        />
      )}
    </main>
  );
}
