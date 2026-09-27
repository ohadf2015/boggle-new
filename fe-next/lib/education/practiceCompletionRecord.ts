/**
 * Recording a finished academy round (Word Workshop, Missed Words Review)
 * through the existing PATCH /api/education/practice — the server scores it
 * (award_education_xp) and returns the session row.
 *
 * Why not read XP back from PracticeSessionProvider: it shows a client-side
 * estimate first and swallows a failed PATCH (logs only), so a round that never
 * saved would still show "+N XP" (Pitfalls Class 4). These helpers make the
 * results screen show the SERVER's number or nothing.
 */

export interface CompletionRecordInput {
  type: string;
  sessionId?: string;
  cardsReviewed?: number;
  cardsCorrect?: number;
  wordsFound?: string[];
  vocabularyWordsFound?: string[];
  newWordsFound?: string[];
}

/** Same fields the provider's PATCH sends. */
export function completionPatchBody(data: CompletionRecordInput): Record<string, unknown> {
  const body: Record<string, unknown> = { sessionId: data.sessionId, completed: true };
  if (data.cardsReviewed !== undefined) body.cardsReviewed = data.cardsReviewed;
  if (data.cardsCorrect !== undefined) body.cardsCorrect = data.cardsCorrect;
  if (data.wordsFound !== undefined) body.wordsFound = data.wordsFound;
  if (data.vocabularyWordsFound !== undefined) body.vocabularyWordsFound = data.vocabularyWordsFound;
  return body;
}

/**
 * Server XP from the PATCH response. `completed_at: null` = recorded only as an
 * attempt (Word Craft below the bar) → 0. Anything unreadable → null (not saved).
 */
export function recordedXpFrom(ok: boolean, body: unknown): number | null {
  if (!ok) return null;
  const session = (body as { session?: { xp_awarded?: unknown; completed_at?: unknown } } | null)?.session;
  if (!session) return null;
  if (session.completed_at == null) return 0;
  return typeof session.xp_awarded === 'number' ? session.xp_awarded : null;
}
