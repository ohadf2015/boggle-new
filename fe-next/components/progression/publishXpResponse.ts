import { publishLevelUp, type LevelUpLike } from '@/lib/avatar/revealTrigger';
import { xpFromResponse } from './resultsXp';
import { publishResultsXp } from './resultsXpStore';

/** For responses shaped `{ xpEarned, newTotalXp, levelUp }` whose results screen reads the store by key. */
export function publishXpResponse(key: string, body: unknown, source: string): void {
  publishResultsXp(key, xpFromResponse(body));
  const levelUp = (body as { levelUp?: LevelUpLike | null } | null)?.levelUp;
  if (levelUp) publishLevelUp(levelUp, source);
}
