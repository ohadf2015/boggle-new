'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { CoinArt } from '@/components/ui/CoinArt';
import { msUntilCoinsLand } from '@/utils/coinEarnedFx';
import styles from './BlastWalletHud.module.css';

export type ReelStop = { kind: 'digit'; start: number; end: number } | { kind: 'sep'; char: string };

/**
 * Reel positions per character of the new balance. A reel strip is
 * [blank, 0-9, 0-9]: earns roll forward through it, spends roll back.
 */
export function reelStops(from: number, to: number, formatted: string): ReelStop[] {
  const up = to > from;
  const stops: ReelStop[] = [];
  let place = 0;
  for (let i = formatted.length - 1; i >= 0; i--) {
    const char = formatted[i];
    if (!/\d/.test(char)) {
      stops.unshift({ kind: 'sep', char });
      continue;
    }
    const nd = Number(char);
    const od = place === 0 || from >= 10 ** place ? Math.floor(from / 10 ** place) % 10 : null;
    place += 1;
    let start = 1 + nd;
    let end = 1 + nd;
    if (od !== nd) {
      if (up) {
        start = od === null ? 0 : 1 + od;
        if (end < start) end += 10;
      } else {
        start = od === null ? 0 : 11 + od;
      }
    }
    stops.unshift({ kind: 'digit', start, end });
  }
  return stops;
}

const DIGITS = '0\n1\n2\n3\n4\n5\n6\n7\n8\n9';
/** Lives in an attribute (drawn by ::before) so the chip's text stays just the balance. */
const REEL_STRIP = `\u00a0\n${DIGITS}\n${DIGITS}`;

type Landing = { key: number; from: number; to: number; delayMs: number; landAt: number };

/**
 * Plans each balance change as one landing, committed with the change itself: the
 * roll, bump and tag are CSS animations delayed until the flying coins arrive, so
 * they play on time even while the main thread is busy clearing the board.
 */
function useWalletLanding(target: number, reduced: boolean): Landing | null {
  const [landing, setLanding] = useState<Landing | null>(null);
  const prev = useRef(target);
  const last = useRef<Landing | null>(null);

  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = target;
    if (target === before) return;
    if (reduced) {
      last.current = null;
      setLanding(null);
      return;
    }
    const now = performance.now();
    const pending = last.current && now < last.current.landAt ? last.current : null;
    const from = pending ? pending.from : before;
    const delayMs = target > from ? msUntilCoinsLand() : 0;
    const next = { key: (last.current?.key ?? 0) + 1, from, to: target, delayMs, landAt: now + delayMs };
    last.current = next;
    setLanding(next);
  }, [target, reduced]);

  return landing;
}

/** The coin wallet: the one counter coins fly into and out of. */
export default function BlastWalletHud({ coins }: { coins: number }) {
  const { t, language } = useLanguage();
  const reduced = useReducedMotion();
  const landing = useWalletLanding(coins, reduced);
  const live = landing && landing.to === coins ? landing : null;
  const formatted = safeToLocaleString(coins, language);
  const gain = live ? live.to - live.from : 0;
  const k = live?.key ?? 0;
  const delay = { animationDelay: `${live?.delayMs ?? 0}ms` };
  const stops = reelStops(live ? live.from : coins, coins, formatted);

  return (
    <div
      data-testid="coin-counter"
      data-coin-counter="true"
      data-landing={live && gain !== 0 ? `${live.from}>${live.to}` : undefined}
      role="status"
      aria-label={t('blast.wallet.coins', { count: coins })}
      className={styles.chip}
    >
      <span key={`b${k}`} className={gain > 0 ? styles.bump : gain < 0 ? styles.dip : styles.still} style={delay}>
        <span className={gain > 0 ? styles.spin : styles.coin} style={delay}>
          <CoinArt size={22} />
        </span>
        <span data-testid="coin-counter-value" className="sr-only">
          {formatted}
        </span>
        <span
          className={`${styles.reels} font-neo-display text-base font-black tabular-nums text-neo-black`}
          dir="ltr"
          aria-hidden="true"
        >
          {stops.map((s, i) =>
            s.kind === 'digit' ? (
              <span
                key={`${k}-${i}`}
                className={styles.reel}
                data-strip={REEL_STRIP}
                style={{ '--start': s.start, '--end': s.end, '--delay': delay.animationDelay } as CSSProperties}
              />
            ) : (
              <span key={`${k}-${i}`} className={styles.sep} data-char={s.char} />
            ),
          )}
        </span>
      </span>
      {gain > 0 && <span key={`r${k}`} className={styles.ring} style={delay} aria-hidden="true" />}
      {gain > 0 && (
        <span
          key={`g${k}`}
          data-testid="coin-counter-gain"
          data-amount={`+${safeToLocaleString(gain, language)}`}
          className={styles.gain}
          style={delay}
          aria-hidden="true"
        />
      )}
      {gain < 0 && (
        <span
          key={`s${k}`}
          data-testid="coin-counter-spent"
          data-amount={`-${safeToLocaleString(-gain, language)}`}
          className={`${styles.gain} ${styles.spent}`}
          style={delay}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
