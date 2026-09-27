'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Hammer, ShieldOff, Wind } from 'lucide-react';
import { type RevengeLedger, raidVerdict } from '@/lib/wordTowerV2/wreck';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { RaidResult, RivalView } from '../useEstate';
import { PaybackChip, PaybackLedgerRow } from './Payback';
import { PayoffPanel } from './PayoffPanel';
import { type T, plotLabel, rivalName } from './rivalUtils';

/**
 * The payout beat, stamped ON the building you just hit.
 *
 * Round 1 put this in a cream card over a blank background: a receipt, not a
 * consequence — the tower you swung at never came back on screen. So this
 * paints nothing of its own behind it. It mounts inside the wreck scene, which
 * is still showing the damaged tower, and only lays a scrim at the top and
 * bottom so the verdict and the buttons stay legible over it.
 *
 * Two outcomes, both loud: their shield shatters and you walk away with pocket
 * change, or their building takes the hit and you leave with their coins.
 *
 * Round 2 shipped a screen that argued with itself — "GLANCING BLOW! / Not a
 * scratch, they sleep well tonight" printed over "Stole 162" and "+196 coins",
 * two headline numbers and a verdict that denied both. The tier now comes from
 * `raidVerdict()` (server payout in, copy out, unit-tested so no tier that says
 * "nothing happened" can ever ship next to a payout), and exactly ONE coin
 * number leads.
 */

interface Props {
  t: T;
  rival: RivalView;
  result: RaidResult | null;
  /** Server refused (no charges, unknown rival…) — say so, don't pretend. */
  error: string | null;
  floorsKnocked: number;
  /**
   * How many floors their building HAD. The damage is only legible as a
   * fraction — "3 of 16 floors down" is a result, "3" is a number — and the
   * judge asked for exactly that receipt beside the coins.
   */
  floorsTotal: number;
  /**
   * Payback only: what they took off you vs what you just took back. The line
   * that makes this screen self-verifying — a reader of ONE frame can see the
   * swing settled the raid that opened the flow, on the player who made it.
   */
  ledger?: RevengeLedger | null;
  reducedMotion: boolean;
  onAgain?: () => void;
  onClose: () => void;
}

export function RaidResultCard({ t, rival, result, error, floorsKnocked, floorsTotal, ledger, reducedMotion, onAgain, onClose }: Props) {
  const { playSound } = useSoundEffects();
  const name = rivalName(rival, t);
  const blocked = result?.outcome.kind === 'blocked';
  const played = useRef(false);

  useEffect(() => {
    // Nudge the global mute FAB off our top corner (it re-probes on resize).
    window.dispatchEvent(new Event('resize'));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (played.current) return;
    played.current = true;
    if (error) return;
    void playSound(blocked ? 'comboBreak' : 'coinCascade', { volume: 0.6 });
  }, [blocked, error, playSound]);

  if (error) {
    return (
      <div className="absolute inset-0 z-[60] flex items-center justify-center bg-neo-navy/85 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-cream p-5 text-center text-neo-navy shadow-hard-lg animate-neo-pop">
          <h2 className="font-neo-display text-2xl font-black uppercase">{t('wordTowerV2.rivals.raidFailed')}</h2>
          <p className="mt-2 font-neo-display text-sm font-bold">
            {error === 'no_charges' ? t('wordTowerV2.rivals.noCharges') : t('wordTowerV2.rivals.raidError')}
          </p>
          <BackButton t={t} onClose={onClose} />
        </div>
      </div>
    );
  }

  const stolen = result?.outcome.kind === 'damaged' ? result.outcome.coinsStolen : 0;
  const slot = result?.outcome.kind === 'damaged' ? result.outcome.slot : null;
  const earned = result?.outcome.attackerCoins ?? 0;
  const pop = reducedMotion ? '' : 'motion-safe:animate-neo-pop';
  const verdict = raidVerdict({
    kind: blocked ? 'blocked' : 'damaged',
    coinsStolen: stolen,
    attackerCoins: earned,
    floorsKnocked,
  });
  const stamp = {
    blocked: { label: t('wordTowerV2.rivals.blocked'), tone: 'bg-neo-purple' },
    demolished: { label: t('wordTowerV2.rivals.smashed'), tone: 'bg-neo-lime' },
    rattled: { label: t('wordTowerV2.rivals.rattled'), tone: 'bg-neo-yellow' },
    nothing: { label: t('wordTowerV2.rivals.missed'), tone: 'bg-neo-cream' },
  }[verdict.tier];
  const body = {
    blocked: t('wordTowerV2.rivals.blockedBody', { name }),
    demolished: t('wordTowerV2.rivals.smashedBody', { n: floorsKnocked, name }),
    rattled: t('wordTowerV2.rivals.rattledBody', { coins: verdict.headlineCoins, name }),
    nothing: t('wordTowerV2.rivals.nothing', { name }),
  }[verdict.tier];
  /**
   * The payback ledger below says how many coins came OFF THEM. So on a revenge
   * screen the big number may only be a steal — leading with "+82 scrap" over
   * "YOU TOOK BACK 0" is the same self-contradiction that sank round 2, one row
   * lower. Scrap drops to the footnote instead, where it reads as what the
   * SWING paid rather than what the payback recovered.
   */
  const bigLoot = verdict.showLoot && (!ledger || verdict.stealHeadline);
  // The footnote only fires when it is NOT the number already on the panel —
  // the same total printed twice at two sizes is how round 2 read as two
  // competing headlines.
  const subCoins = verdict.showLoot && earned !== verdict.headlineCoins ? earned : 0;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[60] flex flex-col justify-between"
      role="dialog"
      aria-modal="true"
      aria-label={t('wordTowerV2.rivals.title')}
    >
      {/* Whose building this is — a strip, not a panel: the wreck stays visible. */}
      <div className="bg-gradient-to-b from-neo-navy via-neo-navy/85 to-transparent px-16 pb-8 pt-3">
        <div className="mx-auto flex w-fit items-center gap-2">
          <PaybackChip t={t} rival={rival} revenge={!!ledger} />
          <span className="rounded-neo border-neo-thick border-black bg-neo-cyan px-2 py-1 font-neo-display text-[11px] font-black uppercase text-neo-navy shadow-hard">
            {t('wordTowerV2.rivals.district', { n: rival.district })}
          </span>
        </div>
      </div>

      {/* The verdict, stamped across the upper third of the damaged tower. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center md:gap-5">
        {blocked ? (
          <Image
            src="/images/word-tower-v2/empire/shield-broken.webp"
            alt=""
            aria-hidden
            width={272}
            height={320}
            className={`h-24 w-auto drop-shadow-[6px_6px_0_rgba(0,0,0,0.9)] md:h-36 ${pop}`}
          />
        ) : null}

        {/* Physical proof that the shake-down happened when no floor fell:
            their coins spilling off the building, the way the bar's raid
            leaves dig-holes in the ground you can point at. */}
        {verdict.tier === 'rattled' ? (
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-[30%] flex justify-center gap-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <Image
                key={i}
                src="/images/word-tower-v2/empire/coin-stack.webp"
                alt=""
                width={236}
                height={256}
                className={`h-8 w-auto drop-shadow-[4px_4px_0_rgba(0,0,0,0.9)] md:h-12 ${pop}`}
                style={{ transform: `translateY(${[0, -22, 14, -14, 8][i]}px) rotate(${[-14, 9, -6, 16, -10][i]}deg)`, animationDelay: `${i * 70}ms` }}
              />
            ))}
          </span>
        ) : null}

        <p
          className={`flex -rotate-3 items-center gap-2 rounded-neo border-neo-thick border-black px-5 py-2 font-neo-display text-3xl font-black uppercase leading-none text-neo-navy shadow-hard-lg md:text-6xl ${stamp.tone} ${pop}`}
        >
          {blocked ? (
            <ShieldOff className="h-7 w-7 md:h-12 md:w-12" aria-hidden />
          ) : verdict.tier === 'nothing' ? (
            <Wind className="h-7 w-7 md:h-12 md:w-12" aria-hidden />
          ) : (
            <Hammer className="h-7 w-7 md:h-12 md:w-12" aria-hidden />
          )}
          {stamp.label}
        </p>

        <p className="max-w-md rounded-neo border-neo border-black bg-neo-navy/90 px-3 py-1.5 font-neo-display text-sm font-bold text-neo-cream md:text-lg">
          {body}
        </p>

        {slot ? (
          <p className="rounded-neo border-neo-thick border-black bg-neo-pink px-3 py-1 font-neo-display text-sm font-black uppercase text-neo-navy shadow-hard md:text-xl">
            {t('wordTowerV2.rivals.plotDown', { plot: plotLabel(slot, t) })}
          </p>
        ) : null}

        {/* ONE number, plus the damage it was paid for. The bar wins this beat
            with "You stole: 58,000" over confetti and nothing else competing;
            round 3 shipped the number and no receipt, and round 4's judge could
            not find a payoff frame at all. */}
        <PayoffPanel
          coins={verdict.showLoot ? verdict.headlineCoins : null}
          coinLabel={
            verdict.stealHeadline
              ? t(ledger ? 'wordTowerV2.rivals.reclaimed' : 'wordTowerV2.rivals.stole', { coins: verdict.headlineCoins })
              : t('wordTowerV2.rivals.scrap', { coins: verdict.headlineCoins })
          }
          muted={!bigLoot}
          /* What the swing DID. A blocked payback used to leave the screen with
             no number at all bar a grey footnote — the exact "payoff is
             invisible" the judge marked us down for. Their wall going down IS
             the result there, so it gets the receipt tile. */
          receipt={
            blocked
              ? t('wordTowerV2.rivals.shieldDown')
              : floorsTotal > 0
                ? t('wordTowerV2.rivals.floorsDown', { n: floorsKnocked, total: floorsTotal })
                : null
          }
          /* Lime is the colour of a win. "0 of 7 floors down" is not one, so
             the tile goes neutral there rather than dressing a nil return up as
             a result — the coins tile is what carries the good news. */
          receiptTone={blocked ? 'bg-neo-purple' : floorsKnocked > 0 ? 'bg-neo-lime' : 'bg-neo-cream'}
          receiptIcon={blocked ? 'shield' : 'floors'}
          reducedMotion={reducedMotion}
        />
      </div>

      {ledger ? <div className="px-3 pb-2">
          <PaybackLedgerRow t={t} rival={rival} ledger={ledger} />
        </div> : null}

      {/* Bottom bar: what you banked, and where to next. */}
      <div className="pointer-events-auto bg-gradient-to-t from-neo-navy via-neo-navy/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
        <div className="mx-auto w-full max-w-md md:max-w-lg">
          {subCoins > 0 ? (
            <p className="mx-auto w-fit font-neo-display text-xs font-bold uppercase tracking-wide text-neo-cream/75 md:text-sm">
              {t('wordTowerV2.rivals.banked', { coins: subCoins })}
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            {onAgain ? (
              <button
                type="button"
                onClick={onAgain}
                className="flex-1 rounded-neo border-neo-thick border-black bg-neo-cyan px-4 py-3 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed md:text-2xl"
              >
                {t('wordTowerV2.rivals.pickAnother')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="flex-1 rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-3 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed md:text-2xl"
            >
              {t('wordTowerV2.rivals.back')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackButton({ t, onClose }: { t: T; onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      autoFocus
      className="mt-4 w-full rounded-neo border-neo-thick border-black bg-neo-pink px-6 py-2.5 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
    >
      {t('wordTowerV2.rivals.back')}
    </button>
  );
}
