import { getAllBossConfigs } from '@/lib/adventure/bossConfig';
import type { BossVisualState } from '@/types/boss';
import type { ClassroomBossId, ClassroomBossView } from '@/shared/types/classroomBoss';

const BY_ID = new Map(getAllBossConfigs().map((b) => [b.id, b]));

export function bossNameKey(id: ClassroomBossId): string {
  return BY_ID.get(id)?.displayName ?? `adventure.bosses.${id}.name`;
}

export function bossImage(id: ClassroomBossId, pose: BossVisualState = 'idle'): string {
  return BY_ID.get(id)?.images[pose] ?? '/images/bosses/boss-lexicon-dragon.png';
}

/** Which pose the art shows: the fight state first, then a fresh hit, then the phase. */
export function bossPose(view: ClassroomBossView, recentlyHit: boolean): BossVisualState {
  if (view.status === 'defeated') return 'defeated';
  if (view.telegraph) return 'attack';
  if (recentlyHit) return 'hurt';
  if (view.phase === 3 || view.status === 'escaped') return 'enraged';
  return 'idle';
}
