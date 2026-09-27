'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useSkipAnimations } from '@/components/motion/AdaptiveMotion';
import { useHighlightClock } from '@/hooks/useHighlightClock';
import { rampRate, RAMP_DEFAULTS } from '@/lib/blast/rampCurve';
import {
  trackHighlightStart,
  trackHighlightSkipped,
} from '@/utils/growthTracking';
import type { RankedMoment } from '@/lib/blast/highlightTypes';
import { LetterboxBars } from './LetterboxBars';
import { ScoreReadout } from './ScoreReadout';
import { WordReveal } from './WordReveal';
import { MascotReaction } from './MascotReaction';
import { BoardClearedCard } from './BoardClearedCard';

const LETTERBOX_IN_MS = 200;
const CLIP_MS = RAMP_DEFAULTS.approachMs + RAMP_DEFAULTS.dwellMs + RAMP_DEFAULTS.followThroughMs;
const CARD_HOLD_MS = 1000;
const FADE_OUT_MS = 300;

interface Props {
  moments: RankedMoment[];
  finalScore: number;
  onComplete: () => void;
}

export function HighlightPlayer({ moments, finalScore, onComplete }: Props) {
  const { t } = useLanguage();
  const { playBlastHighlightStingerSound } = useSoundEffects();
  const skip = useSkipAnimations();
  const { state, start, stop, setRate, setPhase } = useHighlightClock();
  const [skipped, setSkipped] = useState(false);

  const top = moments[0];

  useEffect(() => {
    if (skip) {
      const timeout = setTimeout(onComplete, 1500);
      return () => clearTimeout(timeout);
    }
    trackHighlightStart({ topEpicness: top?.epicness ?? 0, clipCount: 1 });
    setPhase('letterboxIn');
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  useEffect(() => {
    if (skip || skipped) return;
    const elapsed = state.elapsed;

    if (state.phase === 'letterboxIn' && elapsed >= LETTERBOX_IN_MS) {
      setPhase('clip');
      playBlastHighlightStingerSound();
    } else if (state.phase === 'clip') {
      const clipElapsed = elapsed - LETTERBOX_IN_MS;
      setRate(rampRate(clipElapsed, RAMP_DEFAULTS));
      if (clipElapsed >= CLIP_MS) {
        setPhase('card');
        setRate(1.0);
      }
    } else if (state.phase === 'card' && elapsed - LETTERBOX_IN_MS - CLIP_MS >= CARD_HOLD_MS) {
      setPhase('fadeOut');
    } else if (state.phase === 'fadeOut' && elapsed - LETTERBOX_IN_MS - CLIP_MS - CARD_HOLD_MS >= FADE_OUT_MS) {
      stop();
      onComplete();
    }
  }, [state.elapsed, state.phase, skip, skipped, setPhase, setRate, playBlastHighlightStingerSound, stop, onComplete]);

  const handleSkip = useCallback(() => {
    setSkipped(true);
    trackHighlightSkipped({ clipIndex: state.clipIndex, elapsedMs: state.elapsed });
    stop();
    onComplete();
  }, [state.clipIndex, state.elapsed, stop, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') handleSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSkip]);

  if (skip) {
    return (
      <div role="dialog" aria-label={t('blast.highlight.reelLabel')} className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a1a2e]/95">
        <div className="text-center">
          <div style={{ fontFamily: 'Fredoka', fontSize: 24, color: '#FAFF00' }}>
            {t('blast.highlight.bestWord')}
          </div>
          <div style={{ fontFamily: 'Fredoka', fontWeight: 700, fontSize: 64, color: '#fff', marginTop: 8 }}>
            {top?.event.word ?? '—'}
          </div>
          <div style={{ fontFamily: 'Fredoka', fontSize: 36, color: '#FAFF00', marginTop: 8 }}>
            +{top?.event.score ?? 0}
          </div>
        </div>
      </div>
    );
  }

  const inClipPhase = state.phase === 'clip';
  const inCardPhase = state.phase === 'card';
  const showWord = inClipPhase || inCardPhase;

  return (
    <div role="dialog" aria-label={t('blast.highlight.reelLabel')} className="fixed inset-0 z-[55] pointer-events-none">
      <LetterboxBars active={state.phase !== 'idle' && state.phase !== 'fadeOut'} />
      <WordReveal word={top?.event.word ?? ''} visible={showWord} />
      <ScoreReadout score={top?.event.score ?? 0} visible={inClipPhase} />
      <MascotReaction epicness={top?.epicness ?? 0} visible={showWord} />
      <BoardClearedCard finalScore={finalScore} visible={inCardPhase} />

      <button
        type="button"
        onClick={handleSkip}
        className="fixed top-4 right-4 z-[80] px-4 py-2 bg-black/60 text-white rounded pointer-events-auto"
        style={{ minWidth: 44, minHeight: 44, fontFamily: 'Fredoka' }}
        aria-label={t('blast.highlight.skipLabel')}
      >
        {t('blast.highlight.skipLabel')} ▸
      </button>
    </div>
  );
}
