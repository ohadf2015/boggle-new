import React, { useEffect, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Delete, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBackspaceKey } from '@/hooks/useBackspaceKey';
import { HoldHintBubble } from '@/components/game/HoldHintBubble';
import { ACTION_BAR, ACTION_ROUND, ACTION_ROUND_CLASSROOM, actionPrimary } from '@/components/game/hud/actionBar';
import { useClassroomBoard } from '@/components/education/live/classroomBoard';
import { useExperiment } from '@/hooks/useExperiment';
import { trackGrowthEvent } from '@/utils/growthTracking';

type T = (key: string, params?: Record<string, string | number>) => string;

interface WheelActionBarProps {
  t: T;
  hasLetters: boolean;
  canSubmit: boolean;
  isValidating: boolean;
  onClear: () => void;
  onSubmit: () => void;
  onBackspace: () => void;
  submitIcon?: React.ReactNode;
}

// exp-wordwheel-short-word-feedback-v1: 'shake' keeps Submit tappable on a too-short word so the tap answers instead of dead-clicking.
function useShortWordFeedback(hasLetters: boolean, canSubmit: boolean) {
  const { variant, trackExposure } = useExperiment('exp-wordwheel-short-word-feedback-v1');
  useEffect(() => { trackExposure(); }, [trackExposure]);
  const [shake, setShake] = useState(false);
  const active = variant === 'shake' && hasLetters && !canSubmit;
  const onShortAttempt = () => {
    trackGrowthEvent('wordwheel_short_word_tap', { variant });
    setShake(true);
    setTimeout(() => setShake(false), 350);
  };
  return { active, shake, onShortAttempt };
}

/** Clear, submit and backspace under the wheel. */
const WheelActionBar: React.FC<WheelActionBarProps> = ({
  t, hasLetters, canSubmit, isValidating, onClear, onSubmit, onBackspace, submitIcon,
}) => {
  const { handlers: backspaceHold, showHint } = useBackspaceKey({ onTap: onBackspace, onHold: onClear });
  const ready = canSubmit && !isValidating;
  const reducedMotion = useReducedMotion();
  const classroom = useClassroomBoard();
  const round = classroom ? ACTION_ROUND_CLASSROOM : ACTION_ROUND;
  const shortWord = useShortWordFeedback(hasLetters, canSubmit);
  return (
  <div
    data-testid="word-wheel-action-bar"
    // These are tapped rapidly in normal play; keep them out of rage-click detection.
    data-feedback-ignore-rage=""
    data-gr-no-rage=""
    className={cn(ACTION_BAR, 'w-full mt-2 short:mt-0')}
  >
    <button type="button" onClick={onClear} disabled={!hasLetters} className={round} aria-label={t('wordWheel.clear')}>
      <RotateCcw className="size-5 tv:size-9" strokeWidth={2.75} />
    </button>

    <m.button
      type="button"
      onClick={canSubmit ? onSubmit : shortWord.onShortAttempt}
      disabled={isValidating || !(canSubmit || shortWord.active)}
      data-ready={String(ready)}
      className={cn(actionPrimary(ready, { classroom }), 'inline-flex items-center justify-center gap-2')}
      animate={shortWord.shake ? { x: [0, -6, 6, -4, 4, 0] } : isValidating ? { opacity: [1, 0.6, 1] } : ready && !reducedMotion ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={shortWord.shake ? { duration: 0.35 } : isValidating ? { duration: 0.6, repeat: Infinity } : { duration: 0.24, ease: 'easeOut' }}
    >
      {submitIcon}
      {t('wordWheel.submit')}
    </m.button>

    <button type="button" {...backspaceHold} disabled={!hasLetters} className={cn(round, 'relative')} aria-label={t('wordWheel.removeLetter')}>
      <Delete className="size-5 rtl:-scale-x-100 tv:size-9" strokeWidth={2.75} />
      {showHint && <HoldHintBubble label={t('common.holdToClear')} />}
    </button>
  </div>
  );
};

export default WheelActionBar;
