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
  { id: 'he-o-002', word1: 'עץ', word2: 'אדום', bridge: 'תפוח', difficulty: 'easy' }, // עץ תפוח + תפוח אדום
  { id: 'he-o-003', word1: 'מחשב', word2: 'חדש', bridge: 'נייד', difficulty: 'medium' }, // מחשב נייד + נייד חדש
  { id: 'he-o-004', word1: 'אתר', word2: 'מהיר', bridge: 'אינטרנט', difficulty: 'medium' }, // אתר אינטרנט + אינטרנט מהיר
  { id: 'he-o-005', word1: 'ראש', word2: 'חדשה', bridge: 'ממשלה', difficulty: 'medium' }, // ראש ממשלה + ממשלה חדשה
  // Round 2 (authored from known compounds, majority native-review verified)
  { id: 'he-o-006', word1: 'כלב', word2: 'תיכון', bridge: 'ים', difficulty: 'medium' }, // כלב ים + ים תיכון
  { id: 'he-o-007', word1: 'כדור', word2: 'פתוחה', bridge: 'אש', difficulty: 'medium' }, // כדור אש + אש פתוחה
  { id: 'he-o-009', word1: 'כוס', word2: 'מתוקים', bridge: 'מים', difficulty: 'easy' }, // כוס מים + מים מתוקים
  { id: 'he-o-010', word1: 'שן', word2: 'עזים', bridge: 'חלב', difficulty: 'medium' }, // שן חלב + חלב עזים
  { id: 'he-o-011', word1: 'מדליית', word2: 'טהור', bridge: 'זהב', difficulty: 'medium' }, // מדליית זהב + זהב טהור
  { id: 'he-o-012', word1: 'אבן', word2: 'ארץ', bridge: 'דרך', difficulty: 'hard' }, // אבן דרך + דרך ארץ
  { id: 'he-o-014', word1: 'תפוח', word2: 'פורייה', bridge: 'אדמה', difficulty: 'medium' }, // תפוח אדמה + אדמה פורייה
  { id: 'he-o-015', word1: 'מפת', word2: 'עבודה', bridge: 'שולחן', difficulty: 'medium' }, // מפת שולחן + שולחן עבודה
  { id: 'he-o-016', word1: 'מעיל', word2: 'קר', bridge: 'חורף', difficulty: 'easy' }, // מעיל חורף + חורף קר
  { id: 'he-o-017', word1: 'חופשת', word2: 'חם', bridge: 'קיץ', difficulty: 'easy' }, // חופשת קיץ + קיץ חם
  { id: 'he-o-018', word1: 'ציפור', word2: 'טוב', bridge: 'לילה', difficulty: 'easy' }, // ציפור לילה + לילה טוב
  { id: 'he-o-019', word1: 'אור', word2: 'הולדת', bridge: 'יום', difficulty: 'easy' }, // אור יום + יום הולדת
  { id: 'he-o-020', word1: 'מזג', word2: 'צח', bridge: 'אוויר', difficulty: 'medium' }, // מזג אוויר + אוויר צח
  { id: 'he-o-021', word1: 'תחנת', word2: 'תחתית', bridge: 'רכבת', difficulty: 'medium' }, // תחנת רכבת + רכבת תחתית
  { id: 'he-o-022', word1: 'בקבוק', word2: 'זית', bridge: 'שמן', difficulty: 'easy' }, // בקבוק שמן + שמן זית
  { id: 'he-o-024', word1: 'כדור', word2: 'ימין', bridge: 'רגל', difficulty: 'easy' }, // כדור רגל + רגל ימין
  { id: 'he-o-025', word1: 'בת', word2: 'הרע', bridge: 'עין', difficulty: 'hard' }, // בת עין + עין הרע
  { id: 'he-o-026', word1: 'שולחן', word2: 'קשה', bridge: 'עבודה', difficulty: 'medium' }, // שולחן עבודה + עבודה קשה
  { id: 'he-o-027', word1: 'גן', word2: 'בר', bridge: 'חיות', difficulty: 'easy' }, // גן חיות + חיות בר
  { id: 'he-o-028', word1: 'נעלי', word2: 'קבוצתי', bridge: 'ספורט', difficulty: 'medium' }, // נעלי ספורט + ספורט קבוצתי
  { id: 'he-o-029', word1: 'עוגת', word2: 'לבנה', bridge: 'גבינה', difficulty: 'easy' }, // עוגת גבינה + גבינה לבנה
  { id: 'he-o-030', word1: 'כדורי', word2: 'טחון', bridge: 'בשר', difficulty: 'medium' }, // כדורי בשר + בשר טחון
  { id: 'he-o-031', word1: 'ארוחת', word2: 'טוב', bridge: 'ערב', difficulty: 'easy' }, // ארוחת ערב + ערב טוב
  { id: 'he-o-032', word1: 'שעון', word2: 'שמאל', bridge: 'יד', difficulty: 'easy' }, // שעון יד + יד שמאל
  // Round 3 + claude-council (gemini+grok) suggestions — 3-reviewer uniqueness-vetted
  { id: "he-o-033", word1: "חבל", word2: "נקייה", bridge: "כביסה", difficulty: "medium" }, // חבל כביסה + כביסה נקייה
  { id: "he-o-034", word1: "תחנת", word2: "יקר", bridge: "דלק", difficulty: "medium" }, // תחנת דלק + דלק יקר
  { id: "he-o-035", word1: "גדר", word2: "חלוד", bridge: "ברזל", difficulty: "medium" }, // גדר ברזל + ברזל חלוד
  { id: "he-o-036", word1: "ספל", word2: "חזק", bridge: "קפה", difficulty: "easy" }, // ספל קפה + קפה חזק
  { id: "he-o-037", word1: "פקק", word2: "כבדה", bridge: "תנועה", difficulty: "medium" }, // פקק תנועה + תנועה כבדה
  { id: "he-o-038", word1: "מברשת", word2: "טרי", bridge: "צבע", difficulty: "easy" }, // מברשת צבע + צבע טרי
  { id: "he-o-039", word1: "כרטיס", word2: "ישירה", bridge: "טיסה", difficulty: "medium" }, // כרטיס טיסה + טיסה ישירה
  { id: "he-o-040", word1: "שביל", word2: "חשמליים", bridge: "אופניים", difficulty: "medium" }, // שביל אופניים + אופניים חשמליים
  { id: "he-o-041", word1: "בריכת", word2: "אולימפית", bridge: "שחייה", difficulty: "hard" }, // בריכת שחייה + שחייה אולימפית
  { id: "he-o-042", word1: "סיר", word2: "גבוה", bridge: "לחץ", difficulty: "medium" }, // סיר לחץ + לחץ גבוה
  { id: "he-o-043", word1: "גלידת", word2: "מריר", bridge: "שוקולד", difficulty: "easy" }, // גלידת שוקולד + שוקולד מריר
  { id: "he-o-044", word1: "חוט", word2: "עדינה", bridge: "תפירה", difficulty: "hard" }, // חוט תפירה + תפירה עדינה
  { id: "he-o-045", word1: "מפתח", word2: "קטנים", bridge: "ברגים", difficulty: "medium" }, // מפתח ברגים + ברגים קטנים
  { id: "he-o-046", word1: "מי", word2: "פתוח", bridge: "ברז", difficulty: "medium" }, // מי ברז + ברז פתוח
  { id: "he-o-047", word1: "ארגז", word2: "ישנים", bridge: "כלים", difficulty: "easy" }, // ארגז כלים + כלים ישנים
  { id: "he-o-048", word1: "שולי", word2: "ראשי", bridge: "כביש", difficulty: "medium" }, // שולי כביש + כביש ראשי
  { id: "he-o-049", word1: "מסלול", word2: "ארוכה", bridge: "ריצה", difficulty: "medium" }, // מסלול ריצה + ריצה ארוכה
  { id: "he-o-050", word1: "תרמיל", word2: "כפוף", bridge: "גב", difficulty: "medium" }, // תרמיל גב + גב כפוף
  { id: "he-o-051", word1: "נר", word2: "חמה", bridge: "שעווה", difficulty: "medium" }, // נר שעווה + שעווה חמה
  { id: "he-o-052", word1: "גלי", word2: "דיגיטלי", bridge: "רדיו", difficulty: "medium" }, // גלי רדיו + רדיו דיגיטלי
  { id: "he-o-053", word1: "עציץ", word2: "יבשים", bridge: "פרחים", difficulty: "easy" }, // עציץ פרחים + פרחים יבשים
  { id: "he-o-054", word1: "כרית", word2: "רכות", bridge: "נוצות", difficulty: "medium" }, // כרית נוצות + נוצות רכות
  { id: "he-o-055", word1: "סל", word2: "מקוונות", bridge: "קניות", difficulty: "medium" }, // סל קניות + קניות מקוונות
  { id: "he-o-056", word1: "תחנת", word2: "ציבורי", bridge: "אוטובוס", difficulty: "easy" }, // תחנת אוטובוס + אוטובוס ציבורי
  { id: "he-o-057", word1: "סכין", word2: "חלק", bridge: "גילוח", difficulty: "medium" }, // סכין גילוח + גילוח חלק
  { id: "he-o-058", word1: "מסך", word2: "עדין", bridge: "מגע", difficulty: "medium" }, // מסך מגע + מגע עדין
  { id: "he-o-059", word1: "שובר", word2: "גדולה", bridge: "הנחה", difficulty: "easy" }, // שובר הנחה + הנחה גדולה
  { id: "he-o-060", word1: "מד", word2: "גבוה", bridge: "חום", difficulty: "easy" }, // מד חום + חום גבוה
  { id: "he-o-061", word1: "ערוגת", word2: "טריים", bridge: "ירקות", difficulty: "medium" }, // ערוגת ירקות + ירקות טריים
  { id: "he-o-062", word1: "שק", word2: "ממוחזרת", bridge: "אשפה", difficulty: "medium" }, // שק אשפה + אשפה ממוחזרת
  { id: "he-o-063", word1: "לוח", word2: "מעוברת", bridge: "שנה", difficulty: "hard" }, // לוח שנה + שנה מעוברת
  { id: "he-o-064", word1: "חגורת", word2: "מוגברת", bridge: "בטיחות", difficulty: "medium" }, // חגורת בטיחות + בטיחות מוגברת
  { id: "he-o-065", word1: "תיבת", word2: "אלקטרוני", bridge: "דואר", difficulty: "easy" }, // תיבת דואר + דואר אלקטרוני
  { id: "he-o-066", word1: "תעודת", word2: "בדויה", bridge: "זהות", difficulty: "medium" }, // תעודת זהות + זהות בדויה
  { id: "he-o-067", word1: "חדר", word2: "גופני", bridge: "כושר", difficulty: "easy" }, // חדר כושר + כושר גופני
  { id: "he-o-068", word1: "חבילת", word2: "צנוע", bridge: "שי", difficulty: "medium" }, // חבילת שי + שי צנוע
  { id: "he-o-069", word1: "עוגת", word2: "עשירה", bridge: "קצפת", difficulty: "easy" }, // עוגת קצפת + קצפת עשירה
  { id: "he-o-070", word1: "תחנת", word2: "מקומית", bridge: "משטרה", difficulty: "medium" }, // תחנת משטרה + משטרה מקומית
  { id: "he-o-071", word1: "כרטיס", word2: "בתוקף", bridge: "אשראי", difficulty: "medium" }, // כרטיס אשראי + אשראי בתוקף
  { id: "he-o-072", word1: "דלת", word2: "שבורה", bridge: "זכוכית", difficulty: "easy" }, // דלת זכוכית + זכוכית שבורה
  { id: "he-o-073", word1: "עמוד", word2: "גבוהה", bridge: "תאורה", difficulty: "medium" }, // עמוד תאורה + תאורה גבוהה
  { id: "he-o-074", word1: "שקית", word2: "שקופה", bridge: "ניילון", difficulty: "easy" }, // שקית ניילון + ניילון שקופה
  { id: "he-o-075", word1: "כובע", word2: "רחבה", bridge: "מצחייה", difficulty: "medium" }, // כובע מצחייה + מצחייה רחבה
  { id: "he-o-076", word1: "ספר", word2: "ישנים", bridge: "מתכונים", difficulty: "easy" }, // ספר מתכונים + מתכונים ישנים
  { id: "he-o-077", word1: "חלון", word2: "פתוח", bridge: "מטבח", difficulty: "easy" }, // חלון מטבח + מטבח פתוח
  { id: "he-o-078", word1: "שער", word2: "חירום", bridge: "יציאה", difficulty: "medium" }, // שער יציאה + יציאה חירום
  { id: "he-o-079", word1: "דיסק", word2: "חיצוני", bridge: "קשיח", difficulty: "medium" }, // דיסק קשיח + קשיח חיצוני
  // Round 4 — claude-council (gemini+grok) + authored, 3-reviewer uniqueness-vetted
  { id: "he-o-080", word1: "נורת", word2: "מוקדמת", bridge: "אזהרה", difficulty: "medium" }, // נורת אזהרה + אזהרה מוקדמת
  { id: "he-o-081", word1: "עונת", word2: "חצייה", bridge: "מעבר", difficulty: "medium" }, // עונת מעבר + מעבר חצייה
  { id: "he-o-082", word1: "קרם", word2: "עצמית", bridge: "הגנה", difficulty: "medium" }, // קרם הגנה + הגנה עצמית
  { id: "he-o-083", word1: "כתב", word2: "פלילי", bridge: "אישום", difficulty: "medium" }, // כתב אישום + אישום פלילי
  { id: "he-o-084", word1: "חמצן", word2: "כפיים", bridge: "נקי", difficulty: "medium" }, // חמצן נקי + נקי כפיים
  { id: "he-o-085", word1: "חתימת", word2: "שכירות", bridge: "חוזה", difficulty: "medium" }, // חתימת חוזה + חוזה שכירות
  { id: "he-o-086", word1: "תמרור", word2: "פתאומית", bridge: "עצירה", difficulty: "medium" }, // תמרור עצירה + עצירה פתאומית
  { id: "he-o-087", word1: "לוח", word2: "מסחריות", bridge: "מודעות", difficulty: "medium" }, // לוח מודעות + מודעות מסחריות
  { id: "he-o-088", word1: "מחנה", word2: "מפרכים", bridge: "אימונים", difficulty: "medium" }, // מחנה אימונים + אימונים מפרכים
  { id: "he-o-089", word1: "נסיעת", word2: "פתע", bridge: "מבחן", difficulty: "medium" }, // נסיעת מבחן + מבחן פתע
  { id: "he-o-090", word1: "רשימת", word2: "ישיר", bridge: "שידור", difficulty: "medium" }, // רשימת שידור + שידור ישיר
  { id: "he-o-091", word1: "שק", word2: "תאילנדי", bridge: "איגרוף", difficulty: "medium" }, // שק איגרוף + איגרוף תאילנדי
  { id: "he-o-092", word1: "צינור", word2: "עמוקה", bridge: "נשימה", difficulty: "medium" }, // צינור נשימה + נשימה עמוקה
  { id: "he-o-093", word1: "פינת", word2: "ממושכת", bridge: "ישיבה", difficulty: "medium" }, // פינת ישיבה + ישיבה ממושכת
  { id: "he-o-094", word1: "סימן", word2: "נרגשת", bridge: "קריאה", difficulty: "medium" }, // סימן קריאה + קריאה נרגשת
  { id: "he-o-095", word1: "פקק", word2: "טבעי", bridge: "שעם", difficulty: "medium" }, // פקק שעם + שעם טבעי
  { id: "he-o-096", word1: "מדד", word2: "גבוהים", bridge: "מחירים", difficulty: "medium" }, // מדד מחירים + מחירים גבוהים
  { id: "he-o-097", word1: "עמוד", word2: "מוסרית", bridge: "שדרה", difficulty: "medium" }, // עמוד שדרה + שדרה מוסרית
  { id: "he-o-098", word1: "מגדל", word2: "נפש", bridge: "פיקוח", difficulty: "medium" }, // מגדל פיקוח + פיקוח נפש
  { id: "he-o-099", word1: "נמל", word2: "אזרחית", bridge: "תעופה", difficulty: "medium" }, // נמל תעופה + תעופה אזרחית
  { id: "he-o-100", word1: "בית", word2: "עליון", bridge: "משפט", difficulty: "medium" }, // בית משפט + משפט עליון
  { id: "he-o-101", word1: "תחנת", word2: "אש", bridge: "כיבוי", difficulty: "medium" }, // תחנת כיבוי + כיבוי אש
  { id: "he-o-102", word1: "מכון", word2: "מדעי", bridge: "מחקר", difficulty: "medium" }, // מכון מחקר + מחקר מדעי
  { id: "he-o-103", word1: "לשכת", word2: "ממשלתית", bridge: "תעסוקה", difficulty: "medium" }, // לשכת תעסוקה + תעסוקה ממשלתית
  { id: "he-o-104", word1: "עמותת", word2: "האדם", bridge: "זכויות", difficulty: "medium" }, // עמותת זכויות + זכויות האדם
  { id: "he-o-105", word1: "בריכת", word2: "טריים", bridge: "דגים", difficulty: "easy" }, // בריכת דגים + דגים טריים
  { id: "he-o-106", word1: "חוג", word2: "בטן", bridge: "ריקוד", difficulty: "medium" }, // חוג ריקוד + ריקוד בטן
  { id: "he-o-107", word1: "בועת", word2: "נוזלי", bridge: "סבון", difficulty: "easy" }, // בועת סבון + סבון נוזלי
  { id: "he-o-108", word1: "מד", word2: "שיא", bridge: "מהירות", difficulty: "medium" }, // מד מהירות + מהירות שיא
  { id: "he-o-109", word1: "כלי", word2: "קלאסית", bridge: "נגינה", difficulty: "medium" }, // כלי נגינה + נגינה קלאסית
  { id: "he-o-110", word1: "מנורת", word2: "גולמי", bridge: "נפט", difficulty: "hard" }, // מנורת נפט + נפט גולמי
  { id: "he-o-111", word1: "מסמר", word2: "מחוסמת", bridge: "פלדה", difficulty: "hard" }, // מסמר פלדה + פלדה מחוסמת
];
