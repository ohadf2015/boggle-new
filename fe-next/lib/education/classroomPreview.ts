import logger from '@/utils/logger';

export interface ClassroomPreview {
  /**
   * Which of the two six-character code systems this was. Students are handed both through
   * the same `/join/[code]` URL and cannot tell them apart, so the resolver does it for them.
   */
  kind: 'classroom' | 'game';
  id: string;
  name: string;
  language?: string;
  /** Present only for `kind: 'game'` — the live room to walk into. */
  gameCode?: string;
}

/**
 * Confirm a join code before the student commits.
 *
 * Resolves through `/api/education/join-code/resolve`, which understands BOTH the permanent
 * classroom roster code and the live game code shown on the projector. This used to hit the
 * classroom-only preview endpoint, so a student holding the game code — the common case, it
 * is the one on the board — saw no confirmation at all and could not tell a good code from a
 * typo.
 *
 * Returns null when the code resolves to nothing, or on any failure. The caller must treat a
 * null as "no confirmation available", NEVER as "do not let them join": this lookup is a
 * courtesy and must never gate the join button.
 */
export async function lookupClassroomPreview(code: string): Promise<ClassroomPreview | null> {
  try {
    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode || normalizedCode.length !== 6) return null;
    if (!/^[A-Z0-9]+$/.test(normalizedCode)) return null;

    const response = await fetch(
      `/api/education/join-code/resolve?code=${encodeURIComponent(normalizedCode)}`
    );
    if (!response.ok) return null;

    const data = await response.json();

    if (data?.kind === 'classroom') {
      return { kind: 'classroom', id: data.id, name: data.name, language: data.language };
    }
    if (data?.kind === 'game') {
      // A live game has no name of its own worth showing; the teacher's name is what tells a
      // student they are in the right place.
      return {
        kind: 'game',
        id: data.classroomId,
        name: data.teacherName,
        gameCode: data.gameCode,
      };
    }
    return null;
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in lookupClassroomPreview:', error);
    return null;
  }
}
