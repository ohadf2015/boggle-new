'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { Coins } from '@/components/ui/CoinsIcon';
import { getLifeBonusForWord } from '../constants';
import { isGoodVerdict, type HuntPhase, type HuntVerdict } from './huntStage';
import { LUCKY_LIFE_BONUS, pickVariant, praiseFor } from './huntReward';
import { useLiveWord, type LiveWordStore } from './liveWord';
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
  /** While dragging, the pill reads the letters from here instead of `word`. */
  live?: LiveWordStore;
  /** Replaces the idle swipe invite (first games: the word to try when stuck). */
  prompt?: string;
  /** Words found in a row; three or more gets its own cheer. */
  combo?: number;
  lucky?: boolean;
  t: TFn;
}

const same = (w: string) => w;

export function HuntWordStage({ phase, word, verdict, points, coins = null, message, calm, size = 'phone', live, prompt, combo = 1, lucky = false, t }: HuntWordStageProps) {
  const liveWord = useLiveWord(live, same);
  const shownWord = phase === 'live' && live && liveWord ? liveWord : word;
  const letters = phase === 'idle' ? [] : Array.from(shownWord);
  const good = isGoodVerdict(verdict);
  const showVerdict = phase === 'verdict' && verdict;
  const building = phase === 'live' || phase === 'pending';
  const bonus = building ? getLifeBonusForWord(letters.length) : 0;
  const cheer = showVerdict && verdict === 'good' ? praiseFor(shownWord, combo, lucky) : null;
  const cheerParams: Record<string, number> | undefined = lucky ? { bonus: LUCKY_LIFE_BONUS } : combo >= 3 ? { count: combo } : undefined;
  const cheerText = cheer ? pickVariant(t(cheer.key, cheerParams), cheer.index) : '';

  return (
    <div
      data-testid="hunt-stage"
      data-phase={phase}
      data-verdict={showVerdict ? verdict : undefined}
      data-size={size}
      data-calm={calm ? 'true' : 'false'}
      data-lucky={showVerdict && good && lucky ? 'true' : undefined}
      className={styles.stage}
      aria-live="polite"
    >
      {phase === 'idle' && (
        <span data-testid="hunt-stage-prompt" data-hint={prompt ? 'true' : undefined} className={styles.prompt}>
          {prompt || t('wordHunt.survival.stage.prompt')}
        </span>
      )}
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
        {cheer && <span className={styles.praise}>{cheerText}</span>}
        {cheer && !calm && <span data-testid="hunt-stage-burst" aria-hidden="true" className={styles.burst} />}
      </div>
      {showVerdict && !good && message && (
        <span className={styles.reward}>
          <span className={styles.reason}>{message}</span>
        </span>
      )}
      {showVerdict && good && points != null && (
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
