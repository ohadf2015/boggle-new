'use client';

import { Swords } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { PlotSlot } from '@/lib/wordTowerV2/estateCatalog';
import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';
import type { RevengeLedger } from '@/lib/wordTowerV2/wreck';
import type { RivalView } from '../useEstate';
import { TowerMini, boardViewH } from './TowerMini';
import { type T, plotLabel, rivalName } from './rivalUtils';

/**
 * ONE identity, carried unbroken from "they hit you" to "you hit them back".
 *
 * Round 3 lost this round on exactly that seam: the banner named an attacker,
 * the next screen showed a differently-named tower, and nothing on the payout
 * referred back to the raid that caused it — so no single frame proved the
 * payback landed on the player who started it. The bar (Coin Master) wins the
 * beat by opening revenge directly on the named attacker's own village with
 * crosshairs on it.
 *
 * So every payback surface in this flow renders from here: the same avatar
 * (seeded by `userId` — Avatar without one is a skeleton forever), the same
 * name, and the same silhouette of the same stored tower. The building on the
 * banner IS the building on the reveal IS the building you swing at.
 */

/** What they did to you — the debt the payback is settling. */
export interface Grievance {
  coinsStolen: number;
  blocked: boolean;
  plot: PlotSlot | null;
}

export function grievanceLine(t: T, g: Grievance, name: string): string {
  return g.blocked
    ? t('wordTowerV2.rivals.revengeBodyBlocked', { name })
    : t('wordTowerV2.rivals.revengeBody', { name, plot: plotLabel(g.plot, t), coins: g.coinsStolen });
}

/**
 * The full "PAYBACK TIME" card: face, name, grievance, their actual tower, one
 * button. Shared by the end-of-run board and the return-to-game inbox so a
 * player meets the SAME card wherever the payback is offered.
 */
export function PaybackBanner({
  t, rival, name: nameProp, avatarUserId, avatarConfig, grievance, tower, onRevenge, action, compact,
}: {
  t: T;
  rival: RivalView | null;
  /** Their name when no rival view resolved (the raid row still carries one). */
  name?: string;
  /** Avatar seed/config when no rival view resolved — never render without a seed. */
  avatarUserId?: string;
  avatarConfig?: unknown;
  grievance: Grievance;
  /** Their stored floors — the silhouette the reveal and the swing both reuse. */
  tower: TowerBlock[];
  onRevenge?: () => void;
  /** Extra control (dismiss) pinned to the top-end corner. */
  action?: React.ReactNode;
  /** In-game banner: tighter, so it never covers the play area. */
  compact?: boolean;
}) {
  const name = (nameProp ?? '').trim() || rivalName(rival, t);
  return (
    <div
      className={`rounded-neo border-neo-thick border-black bg-neo-pink text-neo-navy shadow-hard-lg motion-safe:animate-neo-pop ${compact ? 'p-2' : 'p-2.5 md:p-4'}`}
    >
      <div className="flex items-stretch gap-2.5">
        {/* Face and building in one stack: at 390px the mini competed with the
            text for the same row and squeezed the name down to "ADV…". */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          <Avatar
            userId={rival?.userId ?? avatarUserId}
            customAvatar={(rival?.avatar.avatarConfig ?? avatarConfig) as never}
            size={compact ? 'md' : 'lg'}
            disableEffects
          />
          {/* Their building, right here on the accusation — so the tower you are
              about to see filling the next screen is one you have already met. */}
          {tower.length > 0 ? (
            <div className={compact ? 'h-12 w-12' : 'h-16 w-14 md:h-28 md:w-24'}>
              <TowerMini tower={tower} viewH={boardViewH([tower])} halfW={towerHalfW(tower)} className="h-full w-full" title={t('wordTowerV2.rivals.target', { name })} />
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 text-start">
          {/* The coin loss shares the LABEL row, not the name row: their name is
              the point of this card and at 390px a badge beside it clipped
              "adv-rogue-0919" down to "ADV-ROGU…". */}
          <div className="flex items-center gap-2">
            <span className="flex min-w-0 flex-1 items-center gap-1 font-neo-display text-[11px] font-black uppercase leading-none tracking-widest">
              <Swords className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{t('wordTowerV2.rivals.revengeTitle')}</span>
            </span>
            {!grievance.blocked && grievance.coinsStolen > 0 ? (
              <span dir="ltr" className={`shrink-0 rounded-neo border-neo-thick border-black bg-neo-navy px-2 py-0.5 text-center font-neo-display font-black tabular-nums leading-none text-neo-yellow shadow-hard ${compact ? 'text-base' : 'text-xl md:text-3xl'}`}>
                -{grievance.coinsStolen}
              </span>
            ) : null}
            {action}
          </div>
          <p className={`mt-1 truncate font-neo-display font-black uppercase leading-none ${compact ? 'text-lg' : 'text-xl md:text-4xl'}`}>
            {name}
          </p>
          {/* The global mute FAB floats over this corner in-game, so the
              compact banner keeps its line clear of it. */}
          <p className={`mt-1.5 font-neo-display text-[12px] font-bold leading-tight md:text-base ${compact ? 'pe-10' : ''}`}>
            {grievanceLine(t, grievance, name)}
          </p>
        </div>
      </div>
      {onRevenge ? (
        <button
          type="button"
          onClick={onRevenge}
          className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-yellow px-2 font-neo-display md:gap-2 md:px-4 font-black uppercase shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed ${compact ? 'py-2 text-sm' : 'py-2.5 text-base md:py-4 md:text-2xl'}`}
        >
          <Swords className={compact ? 'h-5 w-5 shrink-0' : 'h-5 w-5 shrink-0 md:h-8 md:w-8'} aria-hidden />
          <span className="min-w-0 truncate">{t('wordTowerV2.rivals.revengeName', { name })}</span>
          {/* The bonus is a footnote, not a competitor: on a phone it used to
              take a third of the button and clip the name it exists to sell. */}
          <span className="hidden shrink-0 rounded-sm border-neo border-black bg-neo-lime px-1.5 text-[11px] leading-tight sm:inline md:text-sm">
            {t('wordTowerV2.rivals.revengeBonus')}
          </span>
        </button>
      ) : null}
      {onRevenge ? (
        <p className="mt-1 text-center font-neo-display text-[11px] font-black uppercase tracking-wide sm:hidden">
          {t('wordTowerV2.rivals.revengeBonus')}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The identity ribbon that rides the whole raid: reveal, swing and payout all
 * wear it, so a still of ANY of them names who is being hit.
 */
export function PaybackChip({ t, rival, revenge, className = '' }: { t: T; rival: RivalView; revenge: boolean; className?: string }) {
  const name = rivalName(rival, t);
  return (
    <span
      className={`flex max-w-full items-center gap-2 rounded-neo border-neo-thick border-black px-2.5 py-1 shadow-hard ${
        revenge ? 'bg-neo-pink text-neo-navy' : 'bg-neo-cream text-neo-navy'
      } ${className}`}
    >
      <Avatar userId={rival.userId} customAvatar={rival.avatar.avatarConfig as never} size="sm" disableEffects />
      <span className="min-w-0">
        {revenge ? (
          <span className="flex items-center gap-1 font-neo-display text-[10px] font-black uppercase leading-none tracking-widest">
            <Swords className="h-3 w-3" aria-hidden />
            {t('wordTowerV2.rivals.revengeTitle')}
          </span>
        ) : null}
        <span className="block truncate font-neo-display text-lg font-black uppercase leading-tight md:text-2xl">{name}</span>
      </span>
    </span>
  );
}

/**
 * Both sides of the books on one line: what they took off you, what you took
 * back. A screenshot of this cannot be read as a swing at somebody else.
 */
export function PaybackLedgerRow({ t, rival, ledger }: { t: T; rival: RivalView; ledger: RevengeLedger }) {
  const name = rivalName(rival, t);
  const verdict = {
    ahead: t('wordTowerV2.rivals.ledgerAhead', { name, n: ledger.net }),
    square: t('wordTowerV2.rivals.ledgerSquare', { name }),
    short: t('wordTowerV2.rivals.ledgerShort', { name, n: Math.abs(ledger.net) }),
    blocked: t('wordTowerV2.rivals.ledgerBlocked', { name }),
  }[ledger.tier];
  return (
    <div className="mx-auto w-fit max-w-full rounded-neo border-neo-thick border-black bg-neo-navy px-3 py-1.5 text-neo-cream shadow-hard">
      {/* Wraps rather than truncates: at 390px "TOWER-B-0919 TOOK 162" clipped to
          "TOOK 1…", which turned the one line that proves the payback settled
          THIS debt into a number you cannot read. */}
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 font-neo-display text-xs font-black uppercase tabular-nums md:text-lg">
        <Avatar userId={rival.userId} customAvatar={rival.avatar.avatarConfig as never} size="sm" disableEffects />
        <span className="text-neo-pink">{t('wordTowerV2.rivals.ledgerThem', { name, n: ledger.theyTook })}</span>
        <Swords className="h-4 w-4 shrink-0 text-neo-yellow md:h-5 md:w-5" aria-hidden />
        <span className="text-neo-lime">{t('wordTowerV2.rivals.ledgerYou', { n: ledger.youTook })}</span>
      </div>
      <p className="mt-0.5 text-center font-neo-display text-[11px] font-bold uppercase tracking-wide text-neo-cream/85 md:text-sm">{verdict}</p>
    </div>
  );
}

/** Half-width that hugs a single tower, so it never renders as a thin strip. */
export function towerHalfW(tower: TowerBlock[]): number {
  if (!tower.length) return 230;
  return Math.max(...tower.map((b) => Math.abs(b.x) + b.w / 2)) + 40;
}
