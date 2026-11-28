'use client';

import { useCallback, useState, type ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import type { ArcadeGameId } from '@/lib/holidays/arcade/games';
import { readBest, recordBest, type BestResult } from '@/lib/holidays/arcade/best';
import ArcadeResults from './ArcadeResults';
import ArcadeShell from './ArcadeShell';
import { useArcadeRound, type RoundEnd } from './useArcadeRound';
import type { FamilyGameProps } from './family/FamilyGame';
import { GAME_LOADERS } from './gameLoaders';

const loading = () => <div className="h-96 animate-pulse rounded-2xl bg-neo-navy-light/60" />;

const GAMES: Record<ArcadeGameId, ComponentType<FamilyGameProps>> = {
  latke: dynamic(GAME_LOADERS.latke, { ssr: false, loading }),
  spin: dynamic(GAME_LOADERS.spin, { ssr: false, loading }),
  catch: dynamic(GAME_LOADERS.catch, { ssr: false, loading }),
  presents: dynamic(GAME_LOADERS.presents, { ssr: false, loading }),
  splat: dynamic(GAME_LOADERS.splat, { ssr: false, loading }),
  dash: dynamic(GAME_LOADERS.dash, { ssr: false, loading }),
};

interface Props {
  holiday: HolidayKey;
  game: ArcadeGameId;
  onExit: () => void;
}

export default function ArcadeGameHost({ holiday, game, onExit }: Props) {
  const { t } = useLanguage();
  const { state, start, finish } = useArcadeRound(game);
  const [score, setScore] = useState(0);
  const [roster, setRoster] = useState<string[] | null>(null);
  const [best, setBest] = useState<BestResult | null>(null);

  const end = useCallback(
    (e: RoundEnd) => {
      if ((e.players ?? 1) > 1) {
        const prior = readBest(game);
        setBest({ best: prior, previous: prior, verdict: null });
      } else setBest(recordBest(game, e.score));
      finish(e);
    },
    [game, finish],
  );

  const again = useCallback(() => {
    setScore(0);
    start();
  }, [start]);

  const Game = GAMES[game];
  const over = state.phase === 'over';
  return (
    <ArcadeShell
      holiday={holiday}
      game={game}
      score={over ? state.end.score : score}
      onExit={onExit}
      overlay={
        over && best ? (
          <ArcadeResults
            game={game}
            end={state.end}
            settle={state.settle}
            best={best}
            headline={t(`holiday.arcade.${game}.${state.end.won ? 'win' : 'over'}`)}
            onAgain={again}
            onHub={onExit}
          />
        ) : undefined
      }
    >
      <Game key={state.key} content={{ seed: state.seed }} roster={roster} onRoster={setRoster} onScore={setScore} onEnd={end} />
    </ArcadeShell>
  );
}
