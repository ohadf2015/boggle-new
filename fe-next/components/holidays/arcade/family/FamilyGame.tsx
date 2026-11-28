'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { newMatch, passPlay, podium, type Match } from '@/lib/holidays/arcade/kit/passPlay';
import { ARCADE_GAMES, type ArcadeGameId } from '@/lib/holidays/arcade/games';
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
import { playerName } from './playerChip';

export interface FamilyGameProps {
  content: FamilyContent;
  onScore: (score: number) => void;
  onEnd: (end: RoundEnd) => void;
  roster?: string[] | null;
  onRoster?: (names: string[]) => void;
}

interface Props extends FamilyGameProps {
  game: ArcadeGameId;
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

export default function FamilyGame({ game, art, create, focus, content, onScore, onEnd, roster, onRoster }: Props) {
  const { t } = useLanguage();
  const fx = useArcadeFx();
  const sfx = useKitSfx();
  const { region } = useArcadeGate();
  const [match, dispatch] = useReducer(reducer, roster ?? null, (r) => (r ? newMatch(r) : null));
  const [hintTurn, setHintTurn] = useState(-1);
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
    const top = podium(match)[0];
    onEnd({
      score: first,
      won: multi ? podium(match).find((p) => p.index === 0)?.place === 1 : won.current,
      players: match.players.length,
      ...(multi ? { champion: playerName(t, top, top.index), championScore: top.score } : {}),
    });
  }, [match, onEnd, t]);

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
            paused={fx.paused}
            onInput={() => setHintTurn(match.turn)}
            reduced={fx.reduced}
            sfx={sfx}
            label={t(`holiday.arcade.${game}.how`)}
          />
          <TurnHud hud={hud} seconds={meta.seconds} players={multi ? match.players : undefined} turn={match.turn} />
          {hintTurn !== match.turn && !turnOver && (
            <p data-testid="family-hint" className="pointer-events-none absolute inset-x-3 top-16 z-10 mx-auto w-fit max-w-[calc(100%-1.5rem)] rounded-full border-[3px] border-black bg-neo-cream px-4 py-2 text-center font-neo-display text-base font-black leading-tight text-neo-navy shadow-hard">
              {t(`holiday.arcade.${game}.how`)}
            </p>
          )}
          {turnOver && (
            <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
              <p className="rounded-2xl border-[3px] border-black bg-[var(--arcade-accent)] text-neo-white px-5 py-2 font-neo-display text-3xl font-black shadow-hard-lg">
                {t(`holiday.arcade.${game}.${turnOver.won ? 'turnWin' : 'turnOver'}`)}
              </p>
            </div>
          )}
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${meta.bg})` }} />
      )}
      {!match && (
        <PassPlaySetup
          game={game}
          onStart={(names) => {
            onRoster?.(names);
            dispatch({ type: 'start', names });
          }}
        />
      )}
      {match?.phase === 'handoff' && <Handoff match={match} onReady={() => dispatch({ type: 'ready' })} />}
      {match?.phase === 'podium' && <Podium match={match} onDone={() => dispatch({ type: 'finish' })} />}
    </div>
  );
}
