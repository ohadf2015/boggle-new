/**
 * Teacher plan tiers: the caps each tier enforces and the bullets it sells.
 * Provider-neutral (Polar bills Teacher Pro); the numbers come from freeTierLimits.
 */

import { FREE_TIER_LIMITS } from './freeTierLimits'

export type TierId = 'free' | 'pro'

export interface TierConfig {
  id: TierId
  name: string
  price_monthly_usd: number
  classes_limit: number | null // null = unlimited
  students_limit_per_class: number | null
  features: string[]
}

const TIER_CONFIGS: Record<TierId, TierConfig> = {
  // The two caps come from lib/education/freeTierLimits.ts — the upgrade page renders them
  // too and it is a client component, so they cannot live in this file. Do not retype them.
  // Safe to tighten when it shipped (2026-08-23): max classrooms per teacher was 1 and max
  // students per classroom was 1, so no existing free teacher was pushed over the new limit.
  free: {
    id: 'free',
    name: 'Free',
    price_monthly_usd: 0,
    classes_limit: FREE_TIER_LIMITS.classes,
    students_limit_per_class: FREE_TIER_LIMITS.studentsPerClass,
    features: [
      // `as number` because FREE_TIER_LIMITS is `as const`, so tsc narrows `.classes` to the
      // literal 3 and rejects the comparison as provably false. The plural still has to be
      // computed, not hardcoded — this read "Up to 3 class" the moment the cap moved off 1.
      `Up to ${FREE_TIER_LIMITS.classes} ${(FREE_TIER_LIMITS.classes as number) === 1 ? 'class' : 'classes'}`,
      `${FREE_TIER_LIMITS.studentsPerClass} students per class`,
      'Custom word lists & lesson builder',
      'No advertising for your students',
    ],
  },
  // Every bullet here must be something a free teacher CANNOT have. Until 2026-08-25 three of
  // them ("Advanced analytics", "Custom word lists", "Classroom duel mode") shipped ungated —
  // `has_pro` gated the two counts and nothing else — so the card was selling what it was
  // already giving away. Word lists and duels moved down to free (they are what gets a teacher
  // to a first lesson); analytics moved behind components/teacher/ProGate.tsx and is the one
  // paid feature. tierLimits.parity.test.ts fails if a bullet lands here that ProGate cannot
  // refuse.
  pro: {
    id: 'pro',
    name: 'Teacher Pro',
    price_monthly_usd: 9,
    classes_limit: null,
    students_limit_per_class: null,
    features: [
      'Everything in Free',
      'Unlimited classes',
      'Unlimited students',
      'Analytics & printable reports',
      // First word ("pressure") must stay: tierLimits.parity.test.ts and
      // proGating.test.ts match this bullet against the `pressureDials` key
      // ProGate refuses. Wording avoids every free-matrix label word
      // (classrooms/students/lists/ads) or planMatrix.test.ts fails.
      'Pressure dials (calm mode)',
      // First words ("mastery", "missed") are ProGate keys — see the note above.
      // No "word"/"list"/"student": free rows ("Your own word lists", "Ad-free for students") would collide.
      'Mastery heatmap, class-wide',
      'Missed practice, spaced over 1-3-7 days',
    ],
  },
}

export function getTierConfig(tier: TierId): TierConfig {
  return TIER_CONFIGS[tier]
}
