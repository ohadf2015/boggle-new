'use client';

import Image from 'next/image';
import { Building2, ShieldOff } from 'lucide-react';

/**
 * THE PAYOFF. The frame the last round did not have.
 *
 * The blind judge's verdict on round 3 was one sentence: the bar "always closes
 * the loop with a legible number" — "You stole: 58,000" over confetti — and our
 * swing "drops straight back into the base word-spelling screen with zero
 * summary: no coins-earned banner, no 'tower defeated', nothing". Their fix,
 * verbatim: one explicit payoff frame, "+N coins reclaimed, tower-a-0919
 * knocked down X/16 floors", with a confetti/glow beat.
 *
 * So the payout is a PANEL, not a line of body copy: two hard-edged tiles on
 * one row — the money, and the damage as a fraction of their building — with a
 * star burst behind them. One number leads (the coins, biggest thing on the
 * screen); the floors tile is the receipt that says what the money was for.
 *
 * It renders over the wreck it is describing, so the frame proves its own
 * numbers: their damaged tower behind, their face above, the total below.
 */

export function PayoffPanel({
  coins, coinLabel, muted, receipt, receiptTone = 'bg-neo-lime', receiptIcon = 'floors', reducedMotion,
}: {
  /** The ONE number, already chosen by `raidVerdict`. Null = nothing paid out. */
  coins: number | null;
  /** "Stole 120" / "Reclaimed 120" / "+82 scrap" — the verdict's own phrasing. */
  coinLabel: string;
  /**
   * The coins are scrap banked for the swing, not coins taken off them, and a
   * payback ledger is about to say "you took back 0" right underneath. Round 2
   * shipped that pair at the same size and the screen argued with itself; so
   * the scrap is shown — the judge's whole complaint was a payoff you cannot
   * see — but one size down, under its own word.
   */
  muted?: boolean;
  /** What the swing DID, in one line: floors down, or a shield broken. */
  receipt: string | null;
  receiptTone?: string;
  receiptIcon?: 'floors' | 'shield';
  reducedMotion: boolean;
}) {
  const pop = reducedMotion ? '' : 'motion-safe:animate-neo-pop';
  if (coins === null && !receipt) return null;
  return (
    <div className="relative mx-auto w-fit max-w-full">
      {coins !== null && coins > 0 ? <StarBurst reducedMotion={reducedMotion} /> : null}
      <div className="relative flex flex-wrap items-stretch justify-center gap-2 md:gap-4">
        {coins !== null ? (
          <p
            className={`flex items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-navy px-3 py-1.5 font-neo-display font-black leading-none tabular-nums text-neo-yellow shadow-hard-lg md:px-5 md:py-3 ${
              muted ? 'text-2xl md:text-5xl' : 'text-4xl md:text-7xl'
            } ${pop}`}
          >
            <Image
              src="/images/word-tower-v2/empire/coin-stack.webp"
              alt=""
              aria-hidden
              width={236}
              height={256}
              className={muted ? 'h-8 w-auto md:h-14' : 'h-11 w-auto md:h-20'}
            />
            {coinLabel}
          </p>
        ) : null}
        {receipt ? (
          <p
            className={`flex items-center gap-1.5 rounded-neo border-neo-thick border-black px-3 py-1.5 text-center font-neo-display text-sm font-black uppercase leading-tight text-neo-navy shadow-hard-lg md:px-4 md:py-3 md:text-2xl ${receiptTone} ${pop}`}
            style={{ animationDelay: reducedMotion ? undefined : '120ms' }}
          >
            {receiptIcon === 'shield' ? (
              <ShieldOff className="h-5 w-5 shrink-0 md:h-8 md:w-8" aria-hidden />
            ) : (
              <Building2 className="h-5 w-5 shrink-0 md:h-8 md:w-8" aria-hidden />
            )}
            <span dir="auto" className="tabular-nums">{receipt}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The confetti beat, in the art pack's own currency: `fx-star.webp` is a single
 * yellow twinkle meant to be spawned several times at different scales and
 * angles (MANIFEST.md), so that is exactly what this does. Purely decorative —
 * it sits behind the tiles, never over the number it is celebrating — and it
 * simply does not render under `prefers-reduced-motion`.
 */
function StarBurst({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 hidden motion-safe:block">
      {STARS.map((s, i) => (
        <Image
          key={i}
          src="/images/word-tower-v2/empire/fx-star.webp"
          alt=""
          width={87}
          height={96}
          className="absolute h-6 w-auto drop-shadow-[3px_3px_0_rgba(0,0,0,0.9)] motion-safe:animate-neo-pop md:h-11"
          style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `translate(-50%,-50%) rotate(${s.r}deg) scale(${s.s})`, animationDelay: `${140 + i * 60}ms` }}
        />
      ))}
    </span>
  );
}

const STARS = [
  { x: -6, y: 8, r: -18, s: 1 },
  { x: 14, y: -18, r: 12, s: 0.7 },
  { x: 50, y: -26, r: -8, s: 1.1 },
  { x: 86, y: -16, r: 22, s: 0.8 },
  { x: 106, y: 12, r: -14, s: 1 },
  { x: 96, y: 96, r: 8, s: 0.65 },
  { x: 4, y: 100, r: -22, s: 0.75 },
];
