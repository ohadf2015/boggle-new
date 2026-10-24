import { CLASSROOM_BOSS_IDS, isClassroomBossId, type ClassroomBossId } from '@/shared/types/classroomBoss';

/** The boss after the last one fought, so a teacher's class never meets the same one twice running. */
export function nextBossId(last: unknown, roll: () => number = Math.random): ClassroomBossId {
  if (!isClassroomBossId(last)) return CLASSROOM_BOSS_IDS[Math.floor(roll() * CLASSROOM_BOSS_IDS.length)];
  return CLASSROOM_BOSS_IDS[(CLASSROOM_BOSS_IDS.indexOf(last) + 1) % CLASSROOM_BOSS_IDS.length];
}
