'use client';

import React from 'react';
import { Coins, Heart } from 'lucide-react';
import { getLifeBonusForWord } from '../constants';
import { praiseKeyFor, type HuntPhase, type HuntVerdict } from './huntStage';
import styles from './HuntWordStage.module.css';

type TFn = (key: string, params?: Record<string, string | number>) => string;

export interface HuntWordStageProps {
  phase: HuntPhase;
  word: string;
  verdict: HuntVerdict | null;
  points: number | null;
  coins?: number | null;
  message: string;
  calm: boolean;
  size?: 'phone' | 'desktop';
  /** The word being built is as long as the hidden word: submitting it spends a try. */
  guess?: boolean;
  t: TFn;
}

export function HuntWordStage({ phase, word, verdict, points, coins = null, message, calm, size = 'phone', guess = false, t }: HuntWordStageProps) {
  const letters = phase === 'idle' ? [] : Array.from(word);
  const showVerdict = phase === 'verdict' && verdict;
  const building = phase === 'live' || phase === 'pending';
  const bonus = building ? getLifeBonusForWord(letters.length) : 0;
  const showGuess = building && guess && letters.length > 0;
  const announcement = !showVerdict
    ? ''
    : verdict === 'good'
      ? `${word}: ${t(praiseKeyFor(letters.length))}${points != null ? ` +${points}` : ''}`
      : message
        ? `${word}: ${message}`
        : word;

  return (
    <div
      data-testid="hunt-stage"
      data-phase={phase}
      data-verdict={showVerdict ? verdict : undefined}
      data-size={size}
      data-calm={calm ? 'true' : 'false'}
      data-guess={showGuess ? 'true' : undefined}
      className={styles.stage}
    >
      {/* Only verdicts are announced; the letters of a word in progress are not. */}
      <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
      {phase === 'idle' && <span className={styles.prompt}>{t('wordHunt.survival.stage.prompt')}</span>}
      <div data-testid="hunt-stage-pill" className={styles.pill} data-empty={letters.length === 0 ? 'true' : undefined}>
        <span data-testid="hunt-live-word" className={styles.word} style={{ '--n': letters.length } as React.CSSProperties}>
          {letters.map((ch, i) => (
            <span key={i} data-letter={ch} className={styles.letter} style={{ '--i': i } as React.CSSProperties}>
              {ch}
            </span>
          ))}
        </span>
        {building && letters.length > 0 && (
          <span data-testid="hunt-stage-count" className={styles.count}>{letters.length}</span>
        )}
        {bonus > 0 && (
          <span key={bonus} data-testid="hunt-stage-long" className={styles.long}>
            {t('wordHunt.survival.stage.longWord', { bonus })}
          </span>
        )}
        {showGuess && (
          <span data-testid="hunt-stage-guess" className={styles.guess}>
            {t('wordHunt.survival.stage.usesTry')}
          </span>
        )}
        {showVerdict && verdict === 'good' && <span className={styles.praise}>{t(praiseKeyFor(letters.length))}</span>}
      </div>
      {showVerdict && verdict !== 'good' && message && (
        <span className={styles.reward}>
          <span className={styles.reason}>{message}</span>
        </span>
      )}
      {showVerdict && verdict === 'good' && points != null && (
        <span data-testid="hunt-stage-reward" className={styles.reward}>
          <span data-testid="hunt-stage-points" className={styles.points}>
            +{points}
            <Heart className={styles.heart} aria-hidden="true" />
          </span>
          {coins != null && (
            <span data-testid="hunt-stage-coins" className={styles.coins}>
              +{coins}
              <Coins className={styles.coin} aria-hidden="true" />
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export default HuntWordStage;
