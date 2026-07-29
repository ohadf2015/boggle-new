import { useMemo } from 'react';

type UrgencyLevel = 'normal' | 'urgent' | 'critical' | 'extreme';

interface UseTvFinalMinuteResult {
  isFinalMinute: boolean;
  isFinalStretch: boolean;
  isCritical: boolean;
  urgencyLevel: UrgencyLevel;
  heartbeatInterval: number;
  bgTintClass: string;
}

const HEARTBEAT_INTERVALS: Record<UrgencyLevel, number> = {
  normal: 0,
  urgent: 1000,
  critical: 500,
  extreme: 200,
};

const BG_TINT_CLASSES: Record<UrgencyLevel, string> = {
  normal: '',
  urgent: 'bg-red-900/10',
  critical: 'bg-red-900/20',
  extreme: 'bg-red-900/30',
};

function getUrgencyLevel(time: number | null): UrgencyLevel {
  if (time === null || time > 60) return 'normal';
  if (time <= 10) return 'extreme';
  if (time <= 30) return 'critical';
  return 'urgent';
}

export function useTvFinalMinute(remainingTime: number | null): UseTvFinalMinuteResult {
  return useMemo(() => {
    const urgencyLevel = getUrgencyLevel(remainingTime);
    return {
      isFinalMinute: remainingTime !== null && remainingTime <= 60,
      isFinalStretch: remainingTime !== null && remainingTime <= 30,
      isCritical: remainingTime !== null && remainingTime <= 10,
      urgencyLevel,
      heartbeatInterval: HEARTBEAT_INTERVALS[urgencyLevel],
      bgTintClass: BG_TINT_CLASSES[urgencyLevel],
    };
  }, [remainingTime]);
}
