'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { HolidayKey } from '@/lib/holidays/calendar';
import type { PartyGameId } from '@/lib/holidays/arcade/party/games';
import { FIELD } from '@/lib/holidays/arcade/party/field';
import { cn } from '@/lib/utils';
import PixiStage from '../kit/PixiStage';
import type { KitCtx, Scene } from '../kit/types';
import { useKitSfx } from '../kit/useKitSfx';
import { createPartyCatchScene, PARTY_CATCH_ART } from './scenes/partyCatchScene';
import { createPartyDashScene, PARTY_DASH_ART } from './scenes/partyDashScene';
import { createPartySplatScene, PARTY_SPLAT_ART } from './scenes/partySplatScene';
import type { PartyFeed } from './scenes/feed';
import { goFullscreen, JoinCorner, PartyHeader, TV_BTN } from './PartyChrome';
import PartyPodium from './PartyPodium';
import { seatBg } from './seatColor';
import { useTvParty } from './useArcadeParty';
import styles from './party.module.css';
import { PARTY_LOOK, partyBg } from './partyLook';

const SCENES: Record<PartyGameId, { art: string[]; create: (ctx: KitCtx, feed: PartyFeed<never>) => Scene }> = {
  catch: { art: PARTY_CATCH_ART, create: createPartyCatchScene as never },
  splat: { art: PARTY_SPLAT_ART, create: createPartySplatScene as never },
  dash: { art: PARTY_DASH_ART, create: createPartyDashScene as never },
};

export default function PartyTv({ game, holiday, onExit }: { game: PartyGameId; holiday: HolidayKey; onExit: () => void }) {
  const { t, language } = useLanguage();
  const reduced = usePrefersReducedMotion();
  const sfx = useKitSfx();
  const { view, start, snap, events } = useTvParty(game);
  const [left, setLeft] = useState<number | null>(null);
  const look = PARTY_LOOK[holiday];
  const scene = SCENES[game];
  const joinUrl = view.code ? `${window.location.origin}/${language}/holiday-arcade?party=${view.code}` : '';
  const say = useCallback((k: string, v?: Record<string, string | number>) => t(`holiday.arcade.${k}`, v), [t]);
  const playersRef = useRef(view.players);
  playersRef.current = view.players;

  useEffect(() => {
    if (view.phase !== 'playing') return;
    const id = window.setInterval(() => setLeft((snap.current as { left?: number } | null)?.left ?? null), 250);
    return () => window.clearInterval(id);
  }, [view.phase, snap]);

  const create = useCallback(
    (ctx: KitCtx) => scene.create(ctx, { state: () => snap.current as never, drain: () => events.current.splice(0), seat: (id) => playersRef.current.find((p) => p.id === id), say }),
    [scene, snap, events, say],
  );

  const begin = () => {
    goFullscreen();
    start();
  };
  const board = [...view.players].sort((a, b) => (view.scores[b.id] ?? 0) - (view.scores[a.id] ?? 0));

  return (
    <div data-testid="party-tv" className={cn(holiday === 'hanukkah' ? '[--arcade-accent:var(--neo-holiday-blue)]' : '[--arcade-accent:var(--neo-holiday-red)]', 'fixed inset-0 z-50 flex flex-col overflow-hidden bg-neo-navy text-neo-white [container-type:size]')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={partyBg(game)} alt="" className="absolute inset-0 size-full object-cover" />
      <div className={cn('absolute inset-0', view.phase === 'playing' ? 'bg-transparent' : 'bg-gradient-to-b from-neo-navy/40 via-neo-navy/20 to-neo-navy/70')} aria-hidden="true" />
      <PartyHeader
        title={t(`holiday.arcade.${game}.title`)}
        code={view.code}
        codeLabel={t('holiday.arcade.party.codeLabel')}
        backLabel={t('holiday.arcade.back')}
        fullLabel={t('holiday.arcade.party.fullscreen')}
        stripe={look.stripe}
        bulbs={look.bulbs}
        onExit={onExit}
      />

      {view.phase === 'playing' && (
        <>
          <div className="absolute inset-0 z-0">
            <PixiStage art={scene.art} world={FIELD} create={create} paused={false} reduced={reduced} sfx={sfx} label={t(`holiday.arcade.${game}.title`)} />
          </div>
          <ol data-testid="party-board" className="relative z-10 mx-[1.5cqw] mt-[1cqh] flex items-center gap-[0.8cqw] text-[3.6cqh]">
            {board.map((p) => (
              <li key={p.id} className={cn('flex min-w-0 max-w-[24cqw] flex-1 items-center gap-[0.35em] rounded-full border-[0.1em] border-black py-[0.1em] pe-[0.6em] ps-[0.2em] font-neo-display font-black text-neo-navy shadow-hard', seatBg(p.color))}>
                <span className="min-w-0 flex-1 truncate ps-[0.4em]">{p.name}</span>
                <span className="text-[0.8em] tabular-nums">{view.scores[p.id] ?? 0}</span>
              </li>
            ))}
            {left !== null && (
              <li className="ms-auto shrink-0 rounded-full border-[0.1em] border-black bg-neo-pink px-[0.6em] py-[0.1em] font-neo-display font-black tabular-nums text-neo-white shadow-hard">{left}</li>
            )}
          </ol>
          <JoinCorner url={joinUrl} />
        </>
      )}

      {view.phase === 'podium' && <PartyPodium rows={view.podium} mascot={look.mascot} onAgain={begin} />}

      {(view.phase === 'lobby' || view.phase === 'connecting') && (
        <main className="relative z-10 flex min-h-0 flex-1 items-stretch gap-[2.5cqw] px-[2cqw] pb-[3cqh] pt-[3cqh]">
          <section className="flex w-[40cqw] flex-col justify-between gap-[2cqh]">
            <div className="flex flex-col gap-[2cqh]">
              <p className="font-neo-display text-[6cqh] font-black leading-[1.02] [text-shadow:0.06em_0.06em_0_rgb(var(--neo-black))]">{t('holiday.arcade.party.grabPhones')}</p>
              <p className="rounded-[0.5em] border-[0.12em] border-black bg-neo-cream px-[0.7em] py-[0.35em] font-neo-display text-[3.2cqh] font-black text-neo-navy shadow-hard">
                {t(`holiday.arcade.party.howTo.${game}`)}
              </p>
            </div>
            <div className="flex items-center gap-[1.5cqw] rounded-[2cqh] border-[0.45cqh] border-black bg-neo-cream p-[1.6cqh] text-neo-navy shadow-hard-lg">
              {joinUrl && <QRCodeSVG value={joinUrl} className="size-[24cqh] shrink-0" level="M" />}
              <div className="flex flex-col gap-[1cqh]">
                <p className="font-neo-display text-[3.4cqh] font-black leading-tight">{t('holiday.arcade.party.scanToJoin')}</p>
                {view.code && (
                  <p dir="ltr" className="self-start rounded-[0.3em] border-[0.1em] border-black bg-[var(--arcade-accent)] px-[0.4em] font-neo-display text-[8cqh] font-black leading-none tracking-[0.15em] text-neo-white shadow-hard">
                    {view.code}
                  </p>
                )}
              </div>
            </div>
          </section>
          <section className="flex min-w-0 flex-1 flex-col gap-[2cqh] rounded-[2.4cqh] border-[0.45cqh] border-black bg-neo-navy-light/90 p-[2.4cqh] shadow-hard-lg">
            <h2 className="flex items-center justify-between font-neo-display text-[4.6cqh] font-black text-neo-white">
              {t('holiday.arcade.party.players', { n: view.players.length })}
              <span className="text-[3cqh] text-neo-white/70">{view.players.length}/8</span>
            </h2>
            <ul data-testid="party-roster" className="grid min-h-0 flex-1 grid-cols-2 content-start gap-[1.6cqh]">
              {view.players.map((p) => (
                <li key={p.id} className={cn(styles.chipIn, 'flex min-w-0 items-center gap-[0.4em] rounded-full border-[0.12em] border-black py-[0.2em] pe-[0.8em] ps-[0.2em] font-neo-display text-[5cqh] font-black text-neo-navy shadow-hard-lg', seatBg(p.color), !p.connected && 'opacity-50')}>
                  <span className="grid size-[1.5em] shrink-0 place-items-center rounded-full border-[0.1em] border-black bg-neo-white">{p.name.slice(0, 1).toUpperCase()}</span>
                  <span className="truncate">{p.name}</span>
                </li>
              ))}
              {view.players.length === 0 && <li className="col-span-2 font-neo-display text-[3.6cqh] font-black text-neo-white/70">{t('holiday.arcade.party.waiting')}</li>}
            </ul>
            <div className="flex items-end justify-between gap-[2cqw]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={look.mascot} alt="" className={cn('h-[20cqh] w-auto drop-shadow-[0.4cqh_0.4cqh_0_rgb(var(--neo-black))]', styles.cheer)} />
              {view.players.length > 0 ? (
                <button type="button" data-testid="party-start" onClick={begin} className={cn(TV_BTN, 'flex gap-[0.4em] bg-neo-lime px-[0.9em] py-[0.3em] font-neo-display text-[6cqh] font-black text-neo-navy shadow-hard-lg')}>
                  <Play className="size-[0.9em]" aria-hidden="true" />
                  {t('holiday.arcade.party.start')}
                </button>
              ) : (
                <p data-testid="party-start-wait" className="font-neo-display text-[3.4cqh] font-black text-neo-white/80">{t('holiday.arcade.party.needPlayer')}</p>
              )}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
