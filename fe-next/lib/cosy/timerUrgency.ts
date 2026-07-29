/**
 * Timer urgency computation.
 *
 * The countdown timer escalates as time runs out: red at 20s, "very low" at
 * 10s, "critical" (UI-dominating, drop-shadow, pulse) at 5s. That escalation is
 * exactly the kind of time-pressure Cosy / Calm Mode removes.
 *
 * `suppress` (driven by cosy's `suppressTimerUrgency`) clamps the state to
 * 'normal': the timer still shows and still counts — it just stops shouting.
 * Multiplayer keeps the same shared timer; only the visual urgency is dropped.
 */

export type TimerUrgencyState = 'normal' | 'low' | 'veryLow' | 'critical';

export interface TimerUrgency {
  state: TimerUrgencyState;
  isLowTime: boolean;
  isVeryLowTime: boolean;
  isCriticalTime: boolean;
}

const NORMAL: TimerUrgency = {
  state: 'normal',
  isLowTime: false,
  isVeryLowTime: false,
  isCriticalTime: false,
};

export function computeTimerUrgency(remainingTime: number, suppress: boolean): TimerUrgency {
  if (suppress) return NORMAL;

  const isLowTime = remainingTime <= 20;
  const isVeryLowTime = remainingTime <= 10 && remainingTime > 0;
  const isCriticalTime = remainingTime <= 5 && remainingTime > 0;
  const state: TimerUrgencyState = isCriticalTime
    ? 'critical'
    : isVeryLowTime
      ? 'veryLow'
      : isLowTime
        ? 'low'
        : 'normal';

  return { state, isLowTime, isVeryLowTime, isCriticalTime };
}
