'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { newMatch, passPlay, podium, type Match } from '@/lib/holidays/arcade/kit/passPlay';
import { ARCADE_GAMES, type FamilyGameId } from '@/lib/holidays/arcade/games';
import type { FamilyContent } from '@/lib/holidays/arcade/family';
import { useArcadeFx } from '../ArcadeShell';
import type { RoundEnd } from '../useArcadeRound';
import { useArcadeGate } from '../useArcadeGate';
import PixiStage from '../kit/PixiStage';
import type { KitCtx, Scene } from '../kit/types';
import { useKitSfx } from '../kit/useKitSfx';
import type { TurnHud as Hud, TurnOpts, TurnResult } from './scenes/common';
import PassPlaySetup from './PassPlaySetup';
import Handoff from './Handoff';
import Podium from './Podium';
import TurnHud from './TurnHud';

export interface FamilyGameProps {
  content: FamilyContent;
  onScore: (score: number) => void;
  onEnd: (end: RoundEnd) => void;
}

interface Props extends FamilyGameProps {
  game: FamilyGameId;
  art: string[];
  create: (ctx: KitCtx, opts: TurnOpts) => Scene;
  focus?: { x: number; y: number };
}

type Action = { type: 'start'; names: string[] } | { type: 'ready' } | { type: 'turnEnd'; score: number } | { type: 'finish' };

function reducer(m: Match | null, a: Action): Match | null {
  if (a.type === 'start') return newMatch(a.names);
  return m && passPlay(m, a);
}

const TURN_PAUSE_MS = 1400;

export default function FamilyGame({ game, art, create, focus, content, onScore, onEnd }: Props) {
  const { t } = useLanguage();
  const fx = useArcadeFx();
  const sfx = useKitSfx();
  const { region } = useArcadeGate();
  const [match, dispatch] = useReducer(reducer, null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [turnOver, setTurnOver] = useState<TurnResult | null>(null);
  const won = useRef(false);
  const ended = useRef(false);
  const meta = ARCADE_GAMES[game];

  useEffect(() => {
    if (!match || match.phase !== 'done' || ended.current) return;
    ended.current = true;
    const first = match.players[0].score ?? 0;
    const multi = match.players.length > 1;
    onEnd({ score: first, plays: [], won: multi ? podium(match).find((p) => p.index === 0)?.place === 1 : won.current, players: match.players.length });
  }, [match, onEnd]);

  const say = useCallback((key: string, vars?: Record<string, string | number>) => t(`holiday.arcade.${key}`, vars), [t]);
  const cheer = fx.cheer;

  const turn = match?.turn ?? 0;
  const opts = useMemo<TurnOpts>(() => ({
    seed: content.seed + turn * 7919,
    seconds: meta.seconds,
    region,
    say,
    cheer,
    hud: (h) => {
      setHud(h);
      onScore(h.score);
    },
    end: (r) => {
      won.current = r.won;
      setTurnOver(r);
      window.setTimeout(() => {
        setTurnOver(null);
        setHud(null);
        dispatch({ type: 'turnEnd', score: r.score });
      }, TURN_PAUSE_MS);
    },
  }), [content.seed, turn, meta.seconds, region, say, cheer, onScore]);

  const optsRef = useRef(opts);
  optsRef.current = opts;
  const createTurn = useCallback((ctx: KitCtx) => create(ctx, optsRef.current), [create]);

  const player = match?.players[match.turn];
  const multi = (match?.players.length ?? 0) > 1;

  return (
    <div className="relative flex min-h-[32rem] flex-[1_0_auto] flex-col overflow-hidden">
      {match?.phase === 'playing' ? (
        <>
          <PixiStage
            key={match.turn}
            art={art}
            create={createTurn}
            focus={focus}
            paused={fx.paused || !!turnOver}
            reduced={fx.reduced}
            sfx={sfx}
            label={t(`holiday.arcade.${game}.how`)}
          />
          <TurnHud game={game} hud={hud} seconds={meta.seconds} player={multi ? player : undefined} playerIndex={match.turn} />
          {turnOver && (
            <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
              <p className="rounded-2xl border-[3px] border-black bg-neo-holiday-gold px-5 py-2 font-neo-display text-3xl font-black text-neo-navy shadow-hard-lg">
                {t(`holiday.arcade.${game}.${turnOver.won ? 'turnWin' : 'turnOver'}`)}
              </p>
            </div>
          )}
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${meta.bg})` }} />
      )}
      {!match && <PassPlaySetup game={game} onStart={(names) => dispatch({ type: 'start', names })} />}
      {match?.phase === 'handoff' && player && <Handoff player={player} index={match.turn} onReady={() => dispatch({ type: 'ready' })} />}
      {match?.phase === 'podium' && <Podium match={match} onDone={() => dispatch({ type: 'finish' })} />}
    </div>
  );
}
