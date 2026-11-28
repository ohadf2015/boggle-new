'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PARTY_HOLES } from '@/lib/holidays/arcade/party/field';
import type { PartyGameId } from '@/lib/holidays/arcade/party/games';
import { cn } from '@/lib/utils';
import { seatBg } from './seatColor';
import { usePhoneParty, type PodiumRow } from './useArcadeParty';
import { partyBg, PARTY_LOOK } from './partyLook';
import { useFreshTap } from '../useFreshTap';
import { useArcadeGate } from '../useArcadeGate';

const HOLIDAY_OF: Record<PartyGameId, 'hanukkah' | 'christmas'> = { catch: 'hanukkah', splat: 'christmas', dash: 'christmas' };

const BTN = 'flex h-16 w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-black font-neo-display text-2xl font-black shadow-hard-lg active:translate-y-0.5 active:shadow-hard';
const PANEL = 'relative flex w-full flex-1 touch-none select-none flex-col overflow-hidden rounded-[2rem] border-[4px] border-black shadow-hard-lg';

function Pad({ game, color, send }: { game: PartyGameId; color: string; send: (d: Record<string, number | boolean>, force?: boolean) => void }) {
  const { t } = useLanguage();
  const [held, setHeld] = useState(false);
  const [x, setX] = useState(0.5);
  const [hit, setHit] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const relX = (e: PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };

  if (game === 'dash') {
    const set = (on: boolean) => {
      setHeld(on);
      send({ hold: on }, true);
    };
    return (
      <button
        type="button"
        data-testid="party-hold"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          set(true);
        }}
        onPointerUp={() => set(false)}
        onPointerCancel={() => set(false)}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(PANEL, 'items-center justify-center gap-6', seatBg(color), held && 'translate-y-1 shadow-hard')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/holidays/sleigh.webp" alt="" className={cn('w-3/4 drop-shadow-[4px_4px_0_rgb(var(--neo-black))] transition-transform', held ? '-translate-y-6 -rotate-6' : 'rotate-3')} />
        <span className="rounded-2xl border-[3px] border-black bg-neo-white px-5 py-2 font-neo-display text-3xl font-black text-neo-navy shadow-hard">{t('holiday.arcade.party.holdToFly')}</span>
      </button>
    );
  }

  if (game === 'catch') {
    const move = (e: PointerEvent, force = false) => {
      const nx = relX(e);
      setX(nx);
      send({ x: nx }, force);
    };
    return (
      <div
        ref={box}
        data-testid="party-slide"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          move(e, true);
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType !== 'mouse') move(e);
        }}
        className={cn(PANEL, 'items-center justify-between py-6', seatBg(color))}
      >
        <p className="flex items-center gap-1 rounded-2xl border-[3px] border-black bg-neo-white px-4 py-2 font-neo-display text-2xl font-black text-neo-navy shadow-hard">
          <ChevronLeft className="size-7 rtl:rotate-180" aria-hidden="true" />
          {t('holiday.arcade.party.slide')}
          <ChevronRight className="size-7 rtl:rotate-180" aria-hidden="true" />
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/holidays/props-sufganiyah.webp" alt="" className="w-24 drop-shadow-[3px_3px_0_rgb(var(--neo-black))]" />
        <div className="relative h-24 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/holidays/arcade/spr-plate.webp" alt="" className="absolute top-0 w-[38%] drop-shadow-[4px_4px_0_rgb(var(--neo-black))]" style={{ left: `${1 + x * 60}%` }} />
        </div>
      </div>
    );
  }

  const fort = (i: number, big: boolean) => (
    <button
      key={i}
      type="button"
      aria-label={t('holiday.arcade.party.fort', { n: i + 1 })}
      onPointerDown={() => {
        setHit(i);
        send({ hole: i }, true);
      }}
      className="group relative flex h-full min-h-0 flex-1 items-end justify-center rounded-2xl border-[3px] border-dashed border-neo-white/80 bg-neo-white/10 p-1 active:bg-neo-white/40"
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative flex aspect-[6/5] w-full items-end justify-center overflow-hidden rounded-t-full border-[3px] border-black bg-gradient-to-b from-neo-white to-neo-holiday-snow shadow-hard group-active:translate-y-1 group-active:shadow-hard-sm',
          hit === i && 'from-neo-cyan to-neo-cyan',
        )}
      >
        <span className="absolute inset-x-[14%] top-[34%] h-[3px] rounded-full bg-neo-navy/15" />
        <span className="absolute inset-x-[4%] top-[62%] h-[3px] rounded-full bg-neo-navy/15" />
        <span className={cn('relative rounded-t-full border-[3px] border-b-0 border-black bg-neo-navy', big ? 'h-[46%] w-[38%]' : 'h-[48%] w-[44%]')} />
      </span>
    </button>
  );
  const back = PARTY_HOLES.map((h, i) => ({ h, i })).filter(({ h }) => h.scale < 1);
  const front = PARTY_HOLES.map((h, i) => ({ h, i })).filter(({ h }) => h.scale >= 1);
  return (
    <div data-testid="party-field" className={cn(PANEL, 'gap-3 bg-cover bg-center p-3')} style={{ backgroundImage: `url(${partyBg('splat')})` }}>
      <p className={cn('self-center rounded-2xl border-[3px] border-black px-4 py-1 font-neo-display text-2xl font-black text-neo-navy shadow-hard', seatBg(color))}>{t('holiday.arcade.party.tapToThrow')}</p>
      <div dir="ltr" className="flex min-h-0 flex-[2] items-end gap-1.5">{back.map(({ i }) => fort(i, false))}</div>
      <div dir="ltr" className="flex min-h-0 flex-[3] items-end gap-3">{front.map(({ i }) => fort(i, true))}</div>
    </div>
  );
}

function PhonePodium({ seat, rows, onAgain }: { seat: { playerId: string; color: string; game: PartyGameId }; rows: PodiumRow[]; onAgain: () => void }) {
  const { t } = useLanguage();
  const { surface, guard } = useFreshTap(3000);
  const me = rows.find((r) => r.id === seat.playerId);
  return (
    <div {...surface} className={cn(PANEL, 'items-center justify-center gap-4 p-5 text-center', seatBg(seat.color))}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PARTY_LOOK[HOLIDAY_OF[seat.game]].mascot} alt="" className="h-32 w-auto drop-shadow-[4px_4px_0_rgb(var(--neo-black))]" />
      {me && <p className="font-neo-display text-8xl font-black leading-none text-neo-navy">#{me.place}</p>}
      <ol className="flex w-full flex-col gap-1.5">
        {rows.slice(0, 3).map((r) => (
          <li key={r.id} className={cn('flex items-center gap-2 rounded-xl border-[3px] border-black px-3 py-1 font-neo-display text-xl font-black text-neo-navy shadow-hard-sm', seatBg(r.color), r.id === seat.playerId && 'ring-4 ring-neo-white')}>
            <span className="w-6 tabular-nums">{r.place}</span>
            <span className="min-w-0 flex-1 truncate text-start">{r.name}</span>
            <span className="tabular-nums">{r.score}</span>
          </li>
        ))}
      </ol>
      <button type="button" data-testid="party-again" onClick={guard(onAgain)} className={cn(BTN, 'bg-neo-white text-neo-navy')}>
        <RotateCcw className="size-6" aria-hidden="true" />
        {t('holiday.arcade.party.again')}
      </button>
    </div>
  );
}

export default function PartyPhone({ code }: { code: string }) {
  const { t } = useLanguage();
  const { view, seat, join, input, again, connected } = usePhoneParty(code);
  const [name, setName] = useState('');
  const season = useArcadeGate().holiday === 'hanukkah' ? 'hanukkah' : 'christmas';

  if (view.phase === 'missing' || view.phase === 'full') {
    return <p className="mx-auto mt-10 max-w-xs text-center font-neo-display text-2xl font-black text-neo-white">{t(`holiday.arcade.party.${view.phase}`)}</p>;
  }

  if (!seat) {
    return (
      <form
        data-testid="party-join"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) join(name.trim());
        }}
        className="fixed inset-0 z-50 flex flex-col justify-end gap-4 bg-neo-navy bg-cover bg-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-neo-white"
        style={{ backgroundImage: `linear-gradient(to bottom, transparent 20%, var(--neo-navy) 62%), url(${partyBg(season === 'hanukkah' ? 'catch' : 'splat')})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PARTY_LOOK[season].mascot} alt="" className="mx-auto mb-auto mt-6 h-40 w-auto drop-shadow-[4px_4px_0_rgb(var(--neo-black))]" />
        <h1 className="font-neo-display text-5xl font-black leading-none [text-shadow:3px_3px_0_rgb(var(--neo-black))]">{t('holiday.arcade.party.joinTitle')}</h1>
        <p dir="ltr" className="self-start rounded-xl border-[3px] border-black bg-neo-cream px-3 font-neo-display text-3xl font-black tracking-[0.2em] text-neo-navy shadow-hard">{code}</p>
        <label className="flex flex-col gap-1 font-neo-display text-lg font-black">
          {t('holiday.arcade.party.namePlaceholder')}
          <input
            autoFocus
            maxLength={14}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-14 rounded-xl border-[3px] border-black bg-neo-cream px-3 text-2xl font-black text-neo-navy outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          />
        </label>
        <button type="submit" disabled={!connected || !name.trim()} className={cn(BTN, 'bg-neo-lime text-neo-navy disabled:opacity-50')}>
          {t('holiday.arcade.party.join')}
        </button>
      </form>
    );
  }

  return (
    <div data-testid="party-phone" className="fixed inset-0 z-50 flex flex-col gap-3 bg-neo-navy px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-neo-white">
      <header className="flex items-center gap-2">
        <span className={cn('min-w-0 flex-1 truncate rounded-2xl border-[3px] border-black px-4 py-2 font-neo-display text-3xl font-black text-neo-navy shadow-hard', seatBg(seat.color))}>{seat.name}</span>
        <span className="rounded-2xl border-[3px] border-black bg-neo-white px-4 py-2 font-neo-display text-3xl font-black tabular-nums text-neo-navy shadow-hard">{view.scores[seat.playerId] ?? view.podium.find((r) => r.id === seat.playerId)?.score ?? 0}</span>
      </header>
      {!connected && <p role="status" className="text-center font-black text-neo-pink">{t('holiday.arcade.party.reconnecting')}</p>}
      {view.phase === 'playing' ? (
        <Pad game={seat.game} color={seat.color} send={input} />
      ) : view.phase === 'podium' ? (
        <PhonePodium seat={seat} rows={view.podium} onAgain={again} />
      ) : (
        <div className={cn(PANEL, 'items-center justify-center gap-4 p-6 text-center', seatBg(seat.color))}>
          <p data-testid="party-waiting" className="font-neo-display text-4xl font-black leading-tight text-neo-navy">
            {t('holiday.arcade.party.youreIn')}
          </p>
          <p className="font-neo-display text-xl font-black text-neo-navy/80">{t(`holiday.arcade.party.howTo.${seat.game}`)}</p>
        </div>
      )}
    </div>
  );
}
