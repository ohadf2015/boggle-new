import type { MascotVariant } from '@/components/ui/mascotData';
import type { NextActionKind } from './academyIslands';

export interface AcademyMascotInput {
  kind: NextActionKind;
  streakAtRisk: boolean;
  streak: number;
  reviewCount: number;
}

export interface AcademyMascotMood {
  variant: MascotVariant;
  lineKey: string;
  params?: Record<string, number>;
}

/**
 * What Lexi feels about the hub's ONE recommended action. Follows
 * `pickNextAction`'s own priority so the mascot never argues with the hero
 * button — with a single override: a streak that dies tonight outranks every
 * chore except a game that is live right now.
 */
export function academyMascotMood({ kind, streakAtRisk, streak, reviewCount }: AcademyMascotInput): AcademyMascotMood {
  if (kind === 'live') return { variant: 'celebration', lineKey: 'academy.student.mascotLive' };
  if (streakAtRisk) return { variant: 'scared', lineKey: 'academy.student.mascotStreakRisk', params: { count: streak } };
  switch (kind) {
    case 'boss':
      return { variant: 'knight', lineKey: 'academy.student.mascotBoss' };
    case 'review':
      return { variant: 'encouraging', lineKey: 'academy.student.mascotReview', params: { count: reviewCount } };
    case 'join-class':
      return { variant: 'waving', lineKey: 'academy.student.mascotJoin' };
    case 'workshop':
      return { variant: 'gaming', lineKey: 'academy.student.mascotWorkshop' };
    case 'solo':
      return { variant: 'gaming', lineKey: 'academy.student.mascotSolo' };
    default:
      return { variant: 'happy', lineKey: 'academy.student.mascotNext' };
  }
}
