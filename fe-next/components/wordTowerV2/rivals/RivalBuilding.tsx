'use client';

import { useEffect, useState } from 'react';
import { Building2, Crosshair, Hammer, Shield, Swords, Trophy, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { wreckableTower } from '@/lib/wordTowerV2/wreck';
import type { RivalView } from '../useEstate';
import { TowerMini, boardViewH } from './TowerMini';
import { type Grievance, grievanceLine } from './Payback';
import { type T, rivalName } from './rivalUtils';

/**
 * Target reveal, Coin Master's beat: who they are, what they built, what it
 * would cost them — then one loud button. No form, no settings.
 */

interface Props {
  t: T;
  rival: RivalView;
  revenge: boolean;
  /** The raid being answered — restated here so the reveal names the debt. */
  grievance?: Grievance | null;
  /** Raids you may launch right now (one banked per run). */
  charges: number;
  busy: boolean;
  /** The floor they called, so the swing can mark it. */
  onWreck: (targetIndex: number | null) => void;
  onClose: () => void;
}

export function RivalBuilding({ t, rival, revenge, grievance, charges, busy, onWreck, onClose }: Props) {
  const name = rivalName(rival, t);
  // Exactly what the round will build — never a taller preview than the target.
  const tower = wreckableTower(rival.lastTower);
  const floors = tower.length;
  const ready = charges > 0 && floors > 0 && !busy;
  // The bar lets you choose WHICH building to smash. Here that is which floor:
  // the top one is pre-called (the one that hurts most) and a tap moves it.
  const [target, setTarget] = useState<number | null>(floors > 0 ? floors - 1 : null);
  const targetWord = target != null ? (tower[target]?.word ?? '').toUpperCase() : '';
  // Make the global mute FAB re-probe its corner — it only does so on mount and
  // on resize, so it sat on top of this screen's close button in round 2.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
    // Absolute, not fixed: opened from a scrolled board it rendered half off-screen.
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <div className={`absolute inset-0 z-50 flex flex-col overflow-hidden bg-neo-navy p-4 text-neo-cream ${revenge ? 'ring-inset ring-[6px] ring-neo-pink' : ''}`} role="dialog" aria-modal="true">
      {/* Payback opens ON them. The bar's revenge screen is the attacker's own
          village with crosshairs already on it — never a neutral target picker —
          so the debt is restated over their building, in their colour. */}
      {revenge ? (
        <div className="mx-auto mb-2 flex w-full max-w-md items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-pink px-3 py-1.5 pe-14 text-neo-navy shadow-hard motion-safe:animate-neo-pop md:max-w-[78rem] md:pe-3">
          <Swords className="h-5 w-5 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1 text-start font-neo-display text-xs font-black uppercase leading-tight tracking-wide [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden md:text-lg">
            {grievance ? grievanceLine(t, grievance, name) : t('wordTowerV2.rivals.revengeTitle')}
          </p>
          {grievance && !grievance.blocked && grievance.coinsStolen > 0 ? (
            <span className="shrink-0 rounded-sm border-neo border-black bg-neo-navy px-1.5 font-neo-display text-sm font-black tabular-nums text-neo-yellow md:text-xl">
              -{grievance.coinsStolen}
            </span>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        aria-label={t('wordTowerV2.rivals.back')}
        className="absolute end-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      {/* Phone: one column, the tower taking every pixel left over. Desktop/TV:
          the dossier down one side and the building big on the other, because a
          single centred column leaves two thirds of a 1920 screen empty. */}
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col md:max-w-[78rem] md:flex-row-reverse md:items-stretch md:gap-10 md:px-6">
        {/* min-h-0 or the flex child refuses to shrink and the tower renders as
            a thumbnail in a screenful of empty navy — round 2's reveal shot. */}
        <div className="order-2 flex min-h-0 flex-1 items-stretch justify-center md:order-none md:py-4">
          {floors > 0 ? (
            <TowerMini
              tower={tower}
              viewH={boardViewH([tower])}
              halfW={Math.max(...tower.map((b) => Math.abs(b.x) + b.w / 2)) + 62}
              className="h-full w-full motion-safe:animate-neo-pop"
              title={t('wordTowerV2.rivals.target', { name })}
              pick={{
                selected: target,
                onPick: setTarget,
                label: (i) => t('wordTowerV2.rivals.aimAt', { word: (tower[i]?.word ?? '').toUpperCase() }),
              }}
            />
          ) : (
            <p className="py-10 text-center font-neo-display text-base font-bold opacity-70">{t('wordTowerV2.rivals.emptyTower')}</p>
          )}
        </div>

        {/* `contents` on phone: the header, the taunt and the CTA are direct
            children of the column so the tower can own the space between them.
            On desktop this becomes the left-hand dossier. */}
        <div className="contents md:order-none md:flex md:w-[24rem] md:shrink-0 md:flex-col md:justify-center md:gap-6 lg:w-[30rem]">
          <div className="flex items-center gap-3 pe-12 md:pe-0">
            <Avatar userId={rival.userId} customAvatar={rival.avatar.avatarConfig as never} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-neo-display text-2xl font-black uppercase leading-none md:text-4xl">{name}</p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 font-neo-display text-[11px] font-bold uppercase md:mt-2 md:text-sm">
                <span className="rounded-sm border-neo border-black bg-neo-cyan px-1.5 py-0.5 text-neo-navy">
                  {t('wordTowerV2.rivals.district', { n: rival.district })}
                </span>
                <span className="flex items-center gap-1 rounded-sm border-neo border-black bg-neo-lime px-1.5 py-0.5 text-neo-navy">
                  <Trophy className="h-3 w-3 md:h-4 md:w-4" aria-hidden />
                  {rival.bestM.toFixed(0)}
                  {t('wordTowerV2.unitM')}
                </span>
                <span className="flex items-center gap-1 rounded-sm border-neo border-black bg-neo-yellow px-1.5 py-0.5 text-neo-navy">
                  <Building2 className="h-3 w-3 md:h-4 md:w-4" aria-hidden />
                  {t('wordTowerV2.rivals.floors', { n: floors })}
                </span>
                {rival.shields > 0 ? (
                  <span className="flex items-center gap-1 rounded-sm border-neo border-black bg-neo-purple px-1.5 py-0.5 text-neo-navy">
                    <Shield className="h-3 w-3 md:h-4 md:w-4" aria-hidden />
                    {rival.shields}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          {/* Their trash talk first — that is what makes this personal — then the
              one instruction, small, under it. */}
          <div className="mt-2 rounded-neo border-neo border-black bg-neo-navy-light px-12 py-1.5 text-center md:mt-0 md:px-4 md:py-4 md:text-start">
            <p className="font-neo-display text-sm font-bold md:text-2xl md:leading-snug">
              {revenge ? t('wordTowerV2.rivals.tauntRevenge', { name }) : t('wordTowerV2.rivals.taunt', { name })}
            </p>
            {floors > 0 ? (
              <p className="mt-0.5 flex items-center justify-center gap-1.5 font-neo-display text-xs font-bold uppercase tracking-wide text-neo-pink md:mt-2 md:justify-start md:text-base">
                <Crosshair className="h-3.5 w-3.5 shrink-0 md:h-5 md:w-5" aria-hidden />
                {t('wordTowerV2.rivals.pickFloor')}
              </p>
            ) : null}
          </div>

          <div className="order-3 mt-auto md:order-none md:mt-0">
            <button
              type="button"
              onClick={() => onWreck(target)}
              disabled={!ready}
              autoFocus
              className="flex w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-pink px-6 py-4 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-50 disabled:shadow-none md:py-6 md:text-4xl"
            >
              <Hammer className="h-7 w-7 md:h-10 md:w-10" aria-hidden />
              {revenge
                ? t('wordTowerV2.rivals.revengeName', { name })
                : targetWord
                  ? t('wordTowerV2.rivals.wreckFloor', { word: targetWord })
                  : t('wordTowerV2.rivals.wreckName', { name })}
            </button>
            <p className="mt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center font-neo-display text-xs font-bold uppercase tracking-wide opacity-80 md:pb-0 md:text-base">
              {charges > 0 ? t('wordTowerV2.rivals.charges', { n: charges }) : t('wordTowerV2.rivals.noCharges')}
              {revenge && charges > 0 ? ` · ${t('wordTowerV2.rivals.revengeBonus')}` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
