import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { POLAR_PRO_TRIAL_DAYS } from '@/lib/polar';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';

/** Numbers quoted in articles come from the code that enforces them, never retyped per locale. */
export const HELP_FACTS = {
  classes: FREE_TIER_LIMITS.classes,
  students: FREE_TIER_LIMITS.studentsPerClass,
  assignments: FREE_TIER_LIMITS.assignmentsPerClass,
  price: `$${TEACHER_PRO_PRICE_USD}`,
  trialDays: POLAR_PRO_TRIAL_DAYS,
  players: MAX_PLAYERS_PER_ROOM,
} as const;

export const HELP_FACT_KEYS = Object.keys(HELP_FACTS);
