import type { Language } from '@/shared/types';
import { resolveClassroomGameLanguage } from '@/shared/utils/classroomGameLanguage';
import { getClassroomGame } from './classroomGameManager.js';
import { resolveClassroomLanguage } from './supabase/classroomMembership.js';
import logger from '../utils/logger.js';

/** The language a new classroom record is stored with. A failed class lookup never blocks the round. */
export async function resolveCreatedRoomLanguage(classroomId: string, lessonLanguage: string | undefined, vocabularyWords: string[] | undefined): Promise<Language> {
  let classroomLanguage: string | null = null;
  try {
    classroomLanguage = await resolveClassroomLanguage(classroomId);
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `Classroom language lookup failed for ${classroomId}: ${(err as Error).message}`);
  }
  return resolveClassroomGameLanguage({ lessonLanguage, classroomLanguage, vocabularyWords });
}

/**
 * A classroom room plays in the language its record was created with
 * (lesson/class, see resolveClassroomGameLanguage), not the host's UI locale.
 */
export async function classroomRoomLanguage(gameCode: string, hostLanguage: Language | undefined): Promise<Language> {
  try {
    const record = await getClassroomGame(gameCode);
    if (record?.language) return record.language;
  } catch {
    // Lookup failed: keep the room playable in the host's language.
  }
  return hostLanguage || 'en';
}
