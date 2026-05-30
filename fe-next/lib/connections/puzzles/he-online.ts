import type { ConnectionPuzzle } from '../types';

/**
 * Hebrew Word Bridge riddles sourced from well-known Hebrew compounds (online
 * common-word games + lexical knowledge), 2026-05-30. Each was verified by
 * independent native-Hebrew reviewers (majority vote) confirming BOTH
 * "word1 bridge" and "bridge word2" are real, natural Hebrew phrases in that
 * word order; exact duplicates of the existing pool were removed.
 *
 * Kept in a separate file so the imported batch can be audited / trimmed as a
 * unit. The bridge is the answer; word1/word2 are the clues shown to the player.
 * Bridges may carry their natural sofit/final letter (e.g. ים, חורף) — the
 * on-screen keyboard emits base letters and checkGuess normalizes both sides,
 * so they remain solvable (see lib/connections/gameLogic.ts).
 */
export const HE_ONLINE: ConnectionPuzzle[] = [
  // Round 1 (3-judge gate)
  { id: 'he-o-001', word1: 'בית', word2: 'חדש', bridge: 'ספר', difficulty: 'easy' }, // בית ספר + ספר חדש
  { id: 'he-o-002', word1: 'עץ', word2: 'אדום', bridge: 'תפוח', difficulty: 'easy' }, // עץ תפוח + תפוח אדום
  { id: 'he-o-003', word1: 'מחשב', word2: 'חדש', bridge: 'נייד', difficulty: 'medium' }, // מחשב נייד + נייד חדש
  { id: 'he-o-004', word1: 'אתר', word2: 'מהיר', bridge: 'אינטרנט', difficulty: 'medium' }, // אתר אינטרנט + אינטרנט מהיר
  { id: 'he-o-005', word1: 'ראש', word2: 'חדשה', bridge: 'ממשלה', difficulty: 'medium' }, // ראש ממשלה + ממשלה חדשה
  // Round 2 (authored from known compounds, majority native-review verified)
  { id: 'he-o-006', word1: 'כלב', word2: 'תיכון', bridge: 'ים', difficulty: 'medium' }, // כלב ים + ים תיכון
  { id: 'he-o-007', word1: 'כדור', word2: 'פתוחה', bridge: 'אש', difficulty: 'medium' }, // כדור אש + אש פתוחה
  { id: 'he-o-008', word1: 'כלב', word2: 'ספר', bridge: 'בית', difficulty: 'easy' }, // כלב בית + בית ספר
  { id: 'he-o-009', word1: 'כוס', word2: 'מתוקים', bridge: 'מים', difficulty: 'easy' }, // כוס מים + מים מתוקים
  { id: 'he-o-010', word1: 'שן', word2: 'עזים', bridge: 'חלב', difficulty: 'medium' }, // שן חלב + חלב עזים
  { id: 'he-o-011', word1: 'מדליית', word2: 'טהור', bridge: 'זהב', difficulty: 'medium' }, // מדליית זהב + זהב טהור
  { id: 'he-o-012', word1: 'אבן', word2: 'ארץ', bridge: 'דרך', difficulty: 'hard' }, // אבן דרך + דרך ארץ
  { id: 'he-o-013', word1: 'בית', word2: 'תורה', bridge: 'ספר', difficulty: 'easy' }, // בית ספר + ספר תורה
  { id: 'he-o-014', word1: 'תפוח', word2: 'פורייה', bridge: 'אדמה', difficulty: 'medium' }, // תפוח אדמה + אדמה פורייה
  { id: 'he-o-015', word1: 'מפת', word2: 'עבודה', bridge: 'שולחן', difficulty: 'medium' }, // מפת שולחן + שולחן עבודה
  { id: 'he-o-016', word1: 'מעיל', word2: 'קר', bridge: 'חורף', difficulty: 'easy' }, // מעיל חורף + חורף קר
  { id: 'he-o-017', word1: 'חופשת', word2: 'חם', bridge: 'קיץ', difficulty: 'easy' }, // חופשת קיץ + קיץ חם
  { id: 'he-o-018', word1: 'ציפור', word2: 'טוב', bridge: 'לילה', difficulty: 'easy' }, // ציפור לילה + לילה טוב
  { id: 'he-o-019', word1: 'אור', word2: 'הולדת', bridge: 'יום', difficulty: 'easy' }, // אור יום + יום הולדת
  { id: 'he-o-020', word1: 'מזג', word2: 'צח', bridge: 'אוויר', difficulty: 'medium' }, // מזג אוויר + אוויר צח
  { id: 'he-o-021', word1: 'תחנת', word2: 'תחתית', bridge: 'רכבת', difficulty: 'medium' }, // תחנת רכבת + רכבת תחתית
  { id: 'he-o-022', word1: 'בקבוק', word2: 'זית', bridge: 'שמן', difficulty: 'easy' }, // בקבוק שמן + שמן זית
  { id: 'he-o-023', word1: 'שמן', word2: 'ירוק', bridge: 'זית', difficulty: 'easy' }, // שמן זית + זית ירוק
  { id: 'he-o-024', word1: 'כדור', word2: 'ימין', bridge: 'רגל', difficulty: 'easy' }, // כדור רגל + רגל ימין
  { id: 'he-o-025', word1: 'בת', word2: 'הרע', bridge: 'עין', difficulty: 'hard' }, // בת עין + עין הרע
  { id: 'he-o-026', word1: 'שולחן', word2: 'קשה', bridge: 'עבודה', difficulty: 'medium' }, // שולחן עבודה + עבודה קשה
  { id: 'he-o-027', word1: 'גן', word2: 'בר', bridge: 'חיות', difficulty: 'easy' }, // גן חיות + חיות בר
  { id: 'he-o-028', word1: 'נעלי', word2: 'קבוצתי', bridge: 'ספורט', difficulty: 'medium' }, // נעלי ספורט + ספורט קבוצתי
  { id: 'he-o-029', word1: 'עוגת', word2: 'לבנה', bridge: 'גבינה', difficulty: 'easy' }, // עוגת גבינה + גבינה לבנה
  { id: 'he-o-030', word1: 'כדורי', word2: 'טחון', bridge: 'בשר', difficulty: 'medium' }, // כדורי בשר + בשר טחון
  { id: 'he-o-031', word1: 'ארוחת', word2: 'טוב', bridge: 'ערב', difficulty: 'easy' }, // ארוחת ערב + ערב טוב
  { id: 'he-o-032', word1: 'שעון', word2: 'שמאל', bridge: 'יד', difficulty: 'easy' }, // שעון יד + יד שמאל
];
