'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { CoinArt } from '@/components/ui/CoinArt';
import { msUntilCoinsLand } from '@/utils/coinEarnedFx';
import styles from './BlastWalletHud.module.css';

const ROLL_MS = 460;

/**
 * Rolls the shown balance up once the flying coins reach the chip (down at once on
 * a spend). A new target mid-wait or mid-roll retargets the same roll.
 */
function useLandingCountUp(target: number, reduced: boolean) {
  const [shown, setShown] = useState(target);
  const [landing, setLanding] = useState<{ key: number; gain: number } | null>(null);
  const shownRef = useRef(target);
  const targetRef = useRef(target);
  const originRef = useRef(target);
  const roll = useRef<{ from: number; start: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    targetRef.current = target;
    if (reduced) {
      if (timer.current) clearTimeout(timer.current);
      cancelAnimationFrame(raf.current);
      timer.current = null;
      roll.current = null;
      shownRef.current = target;
      originRef.current = target;
      setShown(target);
      return;
    }
    const tick = (now: number) => {
      const r = roll.current;
      if (!r) return;
      const to = targetRef.current;
      const t = Math.min(1, (now - r.start) / ROLL_MS);
      const v = Math.round(r.from + (to - r.from) * (1 - Math.pow(1 - t, 3)));
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else {
        roll.current = null;
        originRef.current = to;
      }
    };
    const begin = () => {
      timer.current = null;
      const from = shownRef.current;
      if (from === targetRef.current) return;
      setLanding((l) => ({ key: (l?.key ?? 0) + 1, gain: targetRef.current - originRef.current }));
      roll.current = { from, start: performance.now() };
      raf.current = requestAnimationFrame(tick);
    };
    if (roll.current) {
      roll.current = { from: shownRef.current, start: performance.now() };
      setLanding((l) => (l ? { ...l, gain: target - originRef.current } : l));
      return;
    }
    if (timer.current || shownRef.current === target) return;
    timer.current = setTimeout(begin, target > shownRef.current ? msUntilCoinsLand() : 0);
  }, [target, reduced]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      cancelAnimationFrame(raf.current);
    },
    [],
  );

  return { shown, landing };
}

/** The in-run coin wallet: the one counter Blast coins fly into. */
export default function BlastWalletHud({ coins }: { coins: number }) {
  const { t, language } = useLanguage();
  const reduced = useReducedMotion();
  const { shown, landing } = useLandingCountUp(coins, reduced);
  const k = landing?.key ?? 0;

  return (
    <div
      data-testid="coin-counter"
      data-coin-counter="true"
      role="status"
      aria-label={t('blast.wallet.coins', { count: coins })}
      className={styles.chip}
    >
      <span key={`b${k}`} className={k ? (landing && landing.gain < 0 ? styles.dip : styles.bump) : 'inline-flex items-center gap-1.5'}>
        <span className={k ? styles.spin : 'inline-flex'}>
          <CoinArt size={22} />
        </span>
        <span
          data-testid="coin-counter-value"
          className="font-neo-display text-lg font-black tabular-nums leading-none text-[#FFC53D]"
          style={{ textShadow: '1px 1px 0 #0b1530' }}
        >
          {safeToLocaleString(shown, language)}
        </span>
      </span>
      {k > 0 && landing && landing.gain > 0 && <span key={`r${k}`} className={styles.ring} aria-hidden="true" />}
      {landing && landing.gain > 0 && (
        <span
          key={`g${k}`}
          data-testid="coin-counter-gain"
          data-amount={`+${safeToLocaleString(landing.gain, language)}`}
          className={styles.gain}
          aria-hidden="true"
        />
      )}
      {landing && landing.gain < 0 && (
        <span
          key={`s${k}`}
          data-testid="coin-counter-spent"
          data-amount={`-${safeToLocaleString(-landing.gain, language)}`}
          className={`${styles.gain} ${styles.spent}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
