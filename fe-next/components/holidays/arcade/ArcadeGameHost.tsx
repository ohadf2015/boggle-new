'use client';

import { useCallback, useState, type ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import type { ArcadeGameId } from '@/lib/holidays/arcade/games';
import ArcadeResults from './ArcadeResults';
import ArcadeShell from './ArcadeShell';
import { useArcadeRound, type RoundEnd } from './useArcadeRound';

export interface GameProps {
  content: never;
  lang: string;
  onScore: (score: number) => void;
  onEnd: (end: RoundEnd) => void;
}

const loading = () => <div className="h-96 animate-pulse rounded-2xl bg-neo-navy-light/60" />;

const GAMES: Record<ArcadeGameId, ComponentType<GameProps>> = {
  oil: dynamic(() => import('./oil/OilGame'), { ssr: false, loading }) as ComponentType<GameProps>,
  sleigh: dynamic(() => import('./sleigh/SleighGame'), { ssr: false, loading }) as ComponentType<GameProps>,
  snowball: dynamic(() => import('./snowball/SnowballGame'), { ssr: false, loading }) as ComponentType<GameProps>,
  dreidel: dynamic(() => import('./dreidel/DreidelGame'), { ssr: false, loading }) as ComponentType<GameProps>,
  wrap: dynamic(() => import('./wrap/WrapGame'), { ssr: false, loading }) as ComponentType<GameProps>,
  sufganiyah: dynamic(() => import('./stack/StackGame'), { ssr: false, loading }) as ComponentType<GameProps>,
  latke: dynamic(() => import('./family/LatkeFlip'), { ssr: false, loading }) as ComponentType<GameProps>,
  spin: dynamic(() => import('./family/SpinOff'), { ssr: false, loading }) as ComponentType<GameProps>,
  presents: dynamic(() => import('./family/PresentStack'), { ssr: false, loading }) as ComponentType<GameProps>,
  splat: dynamic(() => import('./family/SnowballSplat'), { ssr: false, loading }) as ComponentType<GameProps>,
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

  const again = useCallback(() => {
    setScore(0);
    void start();
  }, [start]);

  const Game = GAMES[game];

  if (state.phase === 'loading') {
    return <div className="mx-auto mt-6 h-[28rem] w-full max-w-lg animate-pulse rounded-2xl border-[3px] border-black bg-neo-navy-light/60" role="status" aria-label={t('holiday.arcade.loading')} />;
  }
  if (state.phase === 'error') {
    return (
      <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-3 rounded-2xl border-[3px] border-black bg-neo-navy-light p-4 text-center text-neo-white shadow-hard">
        <p>{t('holiday.arcade.loadError')}</p>
        <button type="button" onClick={again} className="rounded-xl border-[3px] border-black bg-neo-cream px-4 py-2 font-neo-display font-black text-neo-navy shadow-hard">
          {t('holiday.arcade.retry')}
        </button>
      </div>
    );
  }

  const over = state.phase === 'over';
  return (
    <ArcadeShell
      holiday={holiday}
      game={game}
      score={over ? state.end.score : score}
      onExit={onExit}
      overlay={
        over ? (
          <ArcadeResults
            game={game}
            end={state.end}
            settle={state.settle}
            headline={t(state.end.won ? `holiday.arcade.${game}.win` : `holiday.arcade.${game}.over`)}
            onAgain={again}
            onHub={onExit}
          />
        ) : undefined
      }
    >
      <Game key={state.key} content={state.round.content as never} lang={state.round.lang} onScore={setScore} onEnd={finish} />
    </ArcadeShell>
  );
}
