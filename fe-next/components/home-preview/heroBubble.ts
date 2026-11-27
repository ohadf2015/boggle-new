export interface HeroBubbleLine {
  key: string;
  params?: Record<string, string | number>;
}

interface HeroBubbleInput {
  /** Auth, streak and this device's round count have all resolved. */
  ready: boolean;
  roundsPlayed: number;
  streak: number;
  atRisk: boolean;
  name?: string;
}

/** What the home mascot says. Null until every input is known, so the line never flips after it shows. */
export function heroBubble({ ready, roundsPlayed, streak, atRisk, name }: HeroBubbleInput): HeroBubbleLine | null {
  if (!ready) return null;
  if (streak >= 2 && atRisk) return { key: 'dailyStreak.flame.atRisk', params: { n: streak } };
  if (streak >= 2) return { key: 'homePlay.bubbleStreak', params: { n: streak } };
  if (name) return { key: 'homePlay.bubbleBackName', params: { name } };
  return { key: roundsPlayed > 0 ? 'homePlay.bubbleBack' : 'homePlay.bubbleFirst' };
}
