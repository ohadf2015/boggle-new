'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { CoinArt } from '@/components/ui/CoinArt';
import { msUntilCoinsLand } from '@/utils/coinEarnedFx';
import styles from './BlastWalletHud.module.css';

const ROLL_MS = 460;

/** Rolls the shown balance up once the flying coins reach the chip, and down at once on a spend. */
function useLandingCountUp(target: number, reduced: boolean) {
  const [shown, setShown] = useState(target);
  const [landing, setLanding] = useState<{ key: number; gain: number } | null>(null);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    if (reduced) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    let raf = 0;
    const roll = () => {
      setLanding((l) => ({ key: (l?.key ?? 0) + 1, gain: target - from }));
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ROLL_MS);
        const v = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
        shownRef.current = v;
        setShown(v);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const lead = setTimeout(roll, target > from ? msUntilCoinsLand() : 0);
    return () => {
      clearTimeout(lead);
      cancelAnimationFrame(raf);
    };
  }, [target, reduced]);

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
        <span key={`g${k}`} data-testid="coin-counter-gain" className={styles.gain} aria-hidden="true">
          +{safeToLocaleString(landing.gain, language)}
        </span>
      )}
      {landing && landing.gain < 0 && (
        <span key={`s${k}`} data-testid="coin-counter-spent" className={`${styles.gain} ${styles.spent}`} aria-hidden="true">
          -{safeToLocaleString(-landing.gain, language)}
        </span>
      )}
    </div>
  );
}
