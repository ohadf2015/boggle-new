export type FirstDayGoalId = 'join' | 'stars' | 'flame';

export interface FirstDayGoal {
  id: FirstDayGoalId;
  have: number;
  need: number;
  done: boolean;
}

export interface FirstDayInput {
  hasClass: boolean;
  stars: number;
  streak: number;
}

const STARS_GOAL = 3;

export function buildFirstDayGoals({ hasClass, stars, streak }: FirstDayInput): FirstDayGoal[] {
  const join = hasClass ? 1 : 0;
  const starHave = Math.min(Math.max(0, stars), STARS_GOAL);
  const flame = Math.min(Math.max(0, streak), 1);
  return [
    { id: 'join', have: join, need: 1, done: join >= 1 },
    { id: 'stars', have: starHave, need: STARS_GOAL, done: starHave >= STARS_GOAL },
    { id: 'flame', have: flame, need: 1, done: flame >= 1 },
  ];
}

export function isFirstDayDone(goals: FirstDayGoal[]): boolean {
  return goals.every((g) => g.done);
}
