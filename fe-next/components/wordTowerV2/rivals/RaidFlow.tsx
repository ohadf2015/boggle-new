'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Coins, Shield } from 'lucide-react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { wreckingBallCost } from '@/lib/wordTowerV2/estate';
import { revengeLedger, wreckAccuracy, wreckableTower } from '@/lib/wordTowerV2/wreck';
import type { RaidResult, RivalView, UseEstate } from '../useEstate';
import { PaybackChip, type Grievance } from './Payback';
import { WreckScene } from '../WreckScene';
import { RaidResultCard } from './RaidResultCard';
import { type T, rivalName } from './rivalUtils';
import { revengePrize } from './revengePrize';

/**
 * One raid, start to finish: the wrecking ball is already swinging when this
 * opens. Timing the tap is the aim — there is no pre-attack floor to pick.
 * The damage you do here is the accuracy the SERVER scores the raid with;
 * it recomputes the payout from their stored estate, so a client that lies
 * about the swing changes nothing.
 */

interface Props {
  t: T;
  estate: UseEstate;
  rival: RivalView;
  /**
   * The raid this swing answers. Present = payback, and its numbers ride every
   * screen of the flow so the payout can be read as settling THIS debt.
   */
  grievance?: Grievance | null;
  revenge: boolean;
  /** Wrecking balls this raid gets (a run banks more). */
  balls: number;
  reducedMotion: boolean;
  onClose: () => void;
  /** Back to the board instead of out of the raid entirely. */
  onPickAnother?: () => void;
}

export function RaidFlow({ t, estate, rival, revenge, grievance, balls, reducedMotion, onClose, onPickAnother }: Props) {
  const { playSound } = useSoundEffects();
  const [phase, setPhase] = useState<'wreck' | 'result'>('wreck');
  const [swingOver, setSwingOver] = useState(false);
  const [result, setResult] = useState<RaidResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [knocked, setKnocked] = useState(0);
  const [floorsTotal, setFloorsTotal] = useState(() => wreckableTower(rival.lastTower).length);
  const demoPayoff = useRef<'' | 'damaged' | 'blocked'>('');
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const refreshed = useRef(false);
  const { refresh } = estate;

  const ballCost = wreckingBallCost(estate.estate.district);
  const coins = estate.estate.coins;
  const charges = estate.estate.raidCharges;
  const alreadyWrecked = !revenge && !!rival.wreckedToday;
  const canSwing = revenge || (charges > 0 && !alreadyWrecked);
  const canBuy = !revenge && !alreadyWrecked && charges <= 0 && !!estate.buyCharge && ballCost > 0;
  const afford = coins >= ballCost;
  const prize = revengePrize(rival);

  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;
    void refresh();
    void playSound('bossEntrance', { volume: 0.5 });
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.has('demo') ? params.get('payoff') : null;
      demoPayoff.current = mode === '1' ? 'damaged' : mode === 'blocked' ? 'blocked' : '';
    } catch {
      /* no URL (tests, SSR) — the hook simply stays off. */
    }
  }, [refresh, playSound]);

  const buyBall = async () => {
    if (buying) return;
    setBuying(true);
    setBuyError(null);
    const r = await estate.buyCharge();
    setBuying(false);
    if (!r.ok) setBuyError(r.reason === 'coins' ? 'wordTowerV2.dailyTower.ballPoor' : 'wordTowerV2.dailyTower.ballError');
  };

  const finish = useCallback(
    async ({ wrecked, total }: { wrecked: number; total: number }) => {
      setKnocked(wrecked);
      if (total > 0) setFloorsTotal(total);
      setSwingOver(true);
      setBusy(true);
      if (demoPayoff.current) {
        setResult({
          raidId: null,
          outcome:
            demoPayoff.current === 'blocked'
              ? { kind: 'blocked', attackerCoins: 23 }
              : { kind: 'damaged', slot: 'vault', coinsStolen: 120 + wrecked * 20, attackerCoins: 158 + wrecked * 20 },
          revenge,
        });
        setBusy(false);
        setPhase('result');
        return;
      }
      try {
        const res = await estate.raid(rival.userId, wreckAccuracy(wrecked, total), revenge);
        if (!res) setError('guest');
        else if ('error' in res) setError(res.error);
        else setResult(res);
      } catch {
        setError('raid_error');
      }
      setBusy(false);
      setPhase('result');
    },
    [estate, rival.userId, revenge],
  );

  const subHud = (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
      {rival.shields > 0 ? (
        <span className="flex items-center gap-1 rounded-sm border-neo border-black bg-neo-purple px-1.5 py-0.5 font-neo-display text-[11px] font-black uppercase text-neo-navy md:text-sm">
          <Shield className="h-3 w-3 md:h-3.5 md:w-3.5" aria-hidden />
          {t('wordTowerV2.rivals.shieldsN', { n: rival.shields })}
        </span>
      ) : null}
      <span className="flex items-center gap-1 rounded-sm border-neo border-black bg-neo-lime px-1.5 py-0.5 font-neo-display text-[11px] font-black uppercase text-neo-navy md:text-sm">
        <Coins className="h-3 w-3 md:h-3.5 md:w-3.5" aria-hidden />
        {prize.shielded
          ? t('wordTowerV2.rivals.prizeShield', { n: prize.guaranteed })
          : t('wordTowerV2.rivals.prizeLoot', { n: prize.guaranteed })}
      </span>
      {revenge ? (
        <span className="rounded-sm border-neo border-black bg-neo-yellow px-1.5 py-0.5 font-neo-display text-[11px] font-black uppercase text-neo-navy md:text-sm">
          {t('wordTowerV2.rivals.revengeBonus')}
        </span>
      ) : null}
    </div>
  );

  const lockedCta = alreadyWrecked ? (
    <p className="text-center font-neo-display text-sm font-black text-neo-yellow md:text-base">{t('wordTowerV2.rivals.alreadyWrecked')}</p>
  ) : canBuy ? (
    <>
      <button
        type="button"
        onClick={buyBall}
        disabled={buying || !afford || busy}
        data-wt2-buy-ball
        className="flex w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-yellow px-4 py-3 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-50 disabled:shadow-none md:text-xl"
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
  ) : null;

  return (
    <WreckScene
      t={t}
      title={t('wordTowerV2.rivals.target', { name: rivalName(rival, t) })}
      titleChip={<PaybackChip t={t} rival={rival} revenge={revenge} />}
      subHud={subHud}
      tower={rival.lastTower}
      balls={Math.max(2, balls)}
      swingLocked={!canSwing}
      lockedCta={lockedCta}
      hideDamage={result?.outcome.kind === 'blocked'}
      reducedMotion={reducedMotion}
      aftermath={swingOver}
      overlay={
        phase === 'result' ? (
          <RaidResultCard
            t={t}
            rival={rival}
            result={result}
            error={error}
            floorsKnocked={knocked}
            floorsTotal={floorsTotal}
            ledger={
              revenge && grievance
                ? revengeLedger({
                    theyTook: grievance.coinsStolen,
                    youTook: result?.outcome.kind === 'damaged' ? result.outcome.coinsStolen : 0,
                    blocked: result?.outcome.kind === 'blocked',
                  })
                : null
            }
            reducedMotion={reducedMotion}
            onAgain={onPickAnother}
            onClose={onClose}
          />
        ) : null
      }
      onFinish={finish}
      onClose={onClose}
    />
  );
}
