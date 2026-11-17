'use client';

import { useEffect, useState } from 'react';
import { Building2, Coins, Crosshair, Hammer, Shield, Swords, Trophy, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { wreckableTower } from '@/lib/wordTowerV2/wreck';
import type { RivalView } from '../useEstate';
import { TowerMini, boardViewH } from './TowerMini';
import { type Grievance, grievanceLine } from './Payback';
import { type T, rivalName } from './rivalUtils';
import { revengePrize } from './revengePrize';
import { dismissRivalCoach, shouldShowRivalCoach } from './rivalCoach';

/**
 * Target reveal: who they are, what they built, which floor you will aim at,
 * then one loud button. The close control sits at the start of a real header
 * row so it never covers the payback banner or fights the mute FAB (end corner).
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
  /** The floor they called, so the swing can mark it — and aim at it. */
  onWreck: (targetIndex: number | null) => void;
  onClose: () => void;
  /** Coins in the bank, and what a wrecking ball costs — the way past "no charges". */
  coins?: number;
  ballCost?: number;
  onBuyBall?: () => Promise<{ ok: true } | { ok: false; reason: string }>;
}

export function RivalBuilding({ t, rival, revenge, grievance, charges, busy, onWreck, onClose, coins = 0, ballCost = 0, onBuyBall }: Props) {
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [showCoach, setShowCoach] = useState(false);
  const canBuy = !revenge && charges <= 0 && !!onBuyBall && ballCost > 0;
  const afford = coins >= ballCost;
  const buyBall = async () => {
    if (!onBuyBall || buying) return;
    setBuying(true);
    setBuyError(null);
    const r = await onBuyBall();
    setBuying(false);
    if (!r.ok) setBuyError(r.reason === 'coins' ? 'wordTowerV2.dailyTower.ballPoor' : 'wordTowerV2.dailyTower.ballError');
  };
  const name = rivalName(rival, t);
  const tower = wreckableTower(rival.lastTower);
  const floors = tower.length;
  const ready = (revenge || charges > 0) && floors > 0 && !busy;
  const [target, setTarget] = useState<number | null>(floors > 0 ? floors - 1 : null);
  const targetWord = target != null ? (tower[target]?.word ?? '').toUpperCase() : '';
  const prize = revengePrize(rival);
  const goal = revenge
    ? grievance?.blocked
      ? t('wordTowerV2.rivals.goalRevengeBlocked', { name })
      : t('wordTowerV2.rivals.goalRevenge', { name })
    : t('wordTowerV2.rivals.goalRaid', { name });

  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
    window.scrollTo({ top: 0, behavior: 'auto' });
    setShowCoach(shouldShowRivalCoach());
  }, []);

  const hideCoach = () => {
    dismissRivalCoach();
    setShowCoach(false);
  };

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col overflow-hidden bg-neo-navy text-neo-cream ${revenge ? 'ring-inset ring-[6px] ring-neo-pink' : ''}`}
      role="dialog"
      aria-modal="true"
      data-testid="rival-building"
    >
      {/* Close at START, mute FAB reserved at END. Never position the X over the banner. */}
      <header className="flex items-start gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('wordTowerV2.rivals.back')}
          data-testid="rival-building-close"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {revenge ? (
          <div
            data-testid="rival-building-banner"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-pink px-3 py-1.5 text-neo-navy shadow-hard motion-safe:animate-neo-pop"
          >
            <Swords className="h-5 w-5 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 text-start font-neo-display text-xs font-black uppercase leading-tight tracking-wide md:text-lg">
              {grievance ? grievanceLine(t, grievance, name) : t('wordTowerV2.rivals.revengeTitle')}
            </p>
            {grievance && !grievance.blocked && grievance.coinsStolen > 0 ? (
              <span dir="ltr" className="shrink-0 rounded-sm border-neo border-black bg-neo-navy px-1.5 font-neo-display text-sm font-black tabular-nums text-neo-yellow md:text-xl">
                -{grievance.coinsStolen}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        {/* Global in-game mute FAB is pinned to the end corner. */}
        <div className="h-11 w-11 shrink-0" aria-hidden />
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-3 md:max-w-[78rem] md:flex-row-reverse md:items-stretch md:gap-10 md:px-6">
        <div className="order-2 flex min-h-0 flex-1 items-stretch justify-center md:order-none md:py-4">
          {floors > 0 ? (
            <TowerMini
              tower={tower}
              viewH={boardViewH([tower])}
              halfW={Math.max(...tower.map((b) => Math.abs(b.x) + b.w / 2)) + 28}
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

        <div className="contents md:order-none md:flex md:w-[24rem] md:shrink-0 md:flex-col md:justify-center md:gap-6 lg:w-[30rem]">
          <div className="flex items-center gap-3">
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
                    {t('wordTowerV2.rivals.shieldsN', { n: rival.shields })}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="mt-2 rounded-neo border-neo border-black bg-neo-navy-light px-3 py-2 text-center md:mt-0 md:px-4 md:py-4 md:text-start">
            <p data-testid="rival-building-goal" className="font-neo-display text-sm font-bold md:text-2xl md:leading-snug">
              {goal}
            </p>
            {floors > 0 ? (
              <p className="mt-1 flex items-center justify-center gap-1.5 font-neo-display text-xs font-bold uppercase tracking-wide text-neo-yellow md:mt-2 md:justify-start md:text-base">
                <Crosshair className="h-3.5 w-3.5 shrink-0 md:h-5 md:w-5" aria-hidden />
                {t('wordTowerV2.rivals.pickFloor')}
              </p>
            ) : null}
            {showCoach && floors > 0 ? (
              <p data-testid="rival-coach" className="mt-2 rounded-neo border-neo border-black bg-neo-cream px-2.5 py-1.5 text-start font-neo-display text-xs font-bold leading-snug text-neo-navy md:text-sm">
                {t('wordTowerV2.rivals.coachTip')}{' '}
                <button type="button" onClick={hideCoach} className="underline underline-offset-2">
                  {t('wordTowerV2.rivals.coachGotIt')}
                </button>
              </p>
            ) : null}
            {floors > 0 && target != null ? (
              <p className="mt-2 flex flex-wrap items-center justify-center gap-1.5 md:justify-start">
                <span className="max-w-full truncate rounded-sm border-neo border-black bg-neo-yellow px-1.5 py-0.5 font-neo-display text-[11px] font-black uppercase text-neo-navy md:text-sm">
                  {t('wordTowerV2.rivals.aimChip', { word: targetWord })}
                </span>
                <span className="flex items-center gap-1 rounded-sm border-neo border-black bg-neo-lime px-1.5 py-0.5 font-neo-display text-[11px] font-black uppercase text-neo-navy md:text-sm">
                  <Coins className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" aria-hidden />
                  {prize.shielded
                    ? t('wordTowerV2.rivals.prizeShield', { n: prize.guaranteed })
                    : t('wordTowerV2.rivals.prizeLoot', { n: prize.guaranteed })}
                </span>
              </p>
            ) : null}
          </div>

          <div className="order-3 mt-auto md:order-none md:mt-0">
            <button
              type="button"
              onClick={() => onWreck(target)}
              disabled={!ready}
              autoFocus
              data-testid="rival-building-cta"
              className="flex w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-pink px-6 py-4 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-50 disabled:shadow-none md:py-6 md:text-4xl"
            >
              <Hammer className="h-7 w-7 md:h-10 md:w-10" aria-hidden />
              {revenge
                ? t('wordTowerV2.rivals.revengeName', { name })
                : targetWord
                  ? t('wordTowerV2.rivals.wreckFloor', { word: targetWord })
                  : t('wordTowerV2.rivals.wreckName', { name })}
            </button>
            {canBuy ? (
              <>
                <button
                  type="button"
                  onClick={buyBall}
                  disabled={buying || !afford}
                  data-wt2-buy-ball
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-yellow px-4 py-2.5 font-neo-display text-base font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-50 disabled:shadow-none md:text-xl"
                >
                  <Coins className="h-5 w-5 shrink-0" aria-hidden />
                  {t('wordTowerV2.dailyTower.buyBall', { n: ballCost })}
                </button>
                {!afford ? (
                  <p className="mt-1 text-center font-neo-display text-[11px] font-bold text-neo-yellow md:text-sm">
                    {t('wordTowerV2.dailyTower.ballPoor', { n: ballCost - coins })}
                  </p>
                ) : null}
                {buyError && afford ? (
                  <p role="alert" className="mt-1 text-center font-neo-display text-[11px] font-bold text-neo-pink md:text-sm">
                    {t(buyError, { n: ballCost })}
                  </p>
                ) : null}
              </>
            ) : null}
            <p
              className={`mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom),var(--cap-safe-area-bottom,0px))] text-center font-neo-display text-xs font-bold uppercase tracking-wide md:pb-0 md:text-base ${
                revenge ? 'text-neo-lime' : 'opacity-80'
              }`}
            >
              {revenge ? (
                <>
                  <span>{t('wordTowerV2.rivals.revengeFree')}</span>
                  <span className="rounded-sm border-neo border-black bg-neo-lime px-1.5 text-neo-navy">
                    {t('wordTowerV2.rivals.revengeBonus')}
                  </span>
                </>
              ) : (
                <span>{charges > 0 ? t('wordTowerV2.rivals.charges', { n: charges }) : t('wordTowerV2.rivals.noCharges')}</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
