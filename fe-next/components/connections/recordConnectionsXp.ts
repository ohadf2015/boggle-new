import { xpFromResponse } from '@/components/progression/resultsXp';
import { publishResultsXp } from '@/components/progression/resultsXpStore';
import { levelUpFromRecordGame, publishLevelUp } from '@/lib/avatar/revealTrigger';

export async function recordConnectionsXp(xp: number): Promise<void> {
  try {
    const res = await fetch('/api/education/record-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xpAmount: xp, lessonId: 'connections-game', activityType: 'connections' }),
    });
    if (!res.ok) return;
    const data = await res.json();
    publishResultsXp('daily:connections', xpFromResponse(data));
    const levelUp = levelUpFromRecordGame(data);
    if (levelUp) publishLevelUp(levelUp, 'connections');
  } catch {
    // XP is best-effort; a failed save never interrupts the puzzle.
  }
}
