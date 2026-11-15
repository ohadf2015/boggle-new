/**
 * Visible page text for /[locale]/lexiclash-vs-kahoot, in every locale.
 * Metadata (title, description, OG) is deliberately NOT here: it stays English
 * with a noindex on non-English locales (see page.tsx) and is SEO-frozen.
 */
import type { Locale } from '@/i18n/config';
import { vsCommonCopy, type VsCommonCopy } from '@/lib/seo/vsCommonCopy';
import type { VsPageCopy } from '@/lib/seo/vsPageCopy';

export type KahootPageCopy = VsPageCopy;

const pageCopy: Record<Locale, Omit<KahootPageCopy, keyof VsCommonCopy | 'cta2' | 'cta3'>> = {
  en: {
    h1: 'Kahoot is fun. For vocabulary, LexiClash is faster, freer, and word-game native.',
    intro:
      'Kahoot owns the quiz-show classroom moment — that’s their genre and they’re great at it. But for vocabulary, spelling, and language practice, the right tool isn’t a quiz with multiple-choice answers — it’s a word-formation game where students actually search for, build, and recognize words. LexiClash is built for exactly that. Whole class free (no Kahoot+ subscription), no student signup required, six languages with native dictionaries, and the same 5-minute classroom flow Kahoot pioneered.',
    rows: [
      ['Free class play', '✓ 3 classes × 50 students', '✗ Kahoot+ $4-15/mo'],
      ['No student signup', '✓ 6-character join code', '✓ PIN code'],
      ['Game type', 'Word-formation (Boggle/Wheel/Anagram)', 'Quiz / multiple choice'],
      ['Best for', 'Vocabulary, spelling, ESL', 'Trivia, fact recall, review quizzes'],
      ['1v1 duels', '✓ Built-in', '✗'],
      ['6 languages with native dictionaries', '✓ EN/HE/SV/JA/ES/RU', 'Question text any language; no dictionaries'],
      ['Custom curriculum content', '✓ Word lists', '✓ Quiz questions'],
      ['Class analytics', 'Teacher Pro ($9/mo)', 'Limited free; Kahoot+ for full'],
      ['Ad-free in classroom', '✓ Free', 'Free shows promos; Kahoot+ ad-free'],
      ['Mobile + browser', 'Browser-only', 'Apps + web'],
      ['Whole-class multiplayer', '✓ Up to 50 students free', 'Go Free: table 40 / FAQ 10'],
      ['Free participant limit (published)', '✓ Clear: 50 per class', 'Go Free table 40 vs FAQ 10 (kahoot.com/schools/plans)'],
      ['Setup time', 'Under 60 seconds', '2-5 minutes per quiz'],
    ],
    pricingNote:
      'Kahoot pricing as of 2026: Kahoot! Go Free lists Participant limit 40 in the plans table while the same-page FAQ says Go up to 10 (kahoot.com/schools/plans); Kahoot+ tiers raise the cap. LexiClash free classroom cap is a clear 50 students per class.',
    beatsTitle: 'When LexiClash beats Kahoot',
    beats: [
      { title: 'Word games, not quizzes', desc: 'For vocabulary, spelling, and language practice, students need to find, build, and recognize words — not pick from A/B/C/D. Different cognitive workout, better fit for the goal.' },
      { title: 'Free play, Teacher Pro for teacher tools', desc: 'Kahoot pushes you to Kahoot+ for advanced reports, larger games, and certain modes. LexiClash class play stays free: 3 classes × 50 students, no student signup. Teacher Pro ($9/mo) is the paid upgrade for teacher tools — class analytics, printable reports, and calm-mode pressure dials.' },
      { title: 'One published free seat cap', desc: 'Kahoot! Go Free shows Participant limit 40 in the plans table and “Go up to 10” in the same-page FAQ (kahoot.com/schools/plans). LexiClash free is a clear 50 students per class — the join code matches the plan page.' },
      { title: 'Native multilingual dictionaries', desc: 'For ESL/EFL, Hebrew immersion, Spanish bilingual classrooms — LexiClash has full dictionaries in 6 languages. Kahoot supports any text but doesn’t have language-game mechanics.' },
      { title: '1v1 vocabulary duels', desc: 'Pair students for 2-3 minute head-to-head word battles. Kahoot’s format doesn’t support paired-student practice the same way.' },
      { title: 'Faster setup', desc: 'Kahoot quizzes take 2-5 minutes per quiz to author. LexiClash word lists upload in under a minute, and many teachers use built-in lists for instant play.' },
      { title: 'Ad-free classroom', desc: 'Free Kahoot occasionally surfaces promos to students. LexiClash classroom mode is ad-free in all tiers.' },
    ],
    winsTitle: 'When Kahoot still wins',
    wins:
      'Kahoot is built for trivia, review quizzes, and presentation-driven learning. If your goal is to quiz students on history facts, science vocabulary in question form, or end-of-unit multiple-choice review, Kahoot’s format is purpose-built for that. LexiClash is the better fit for vocabulary spelling, language pattern recognition, ESL/EFL practice, and word-formation games. Many teachers use both: Kahoot for fact-quiz review, LexiClash for vocabulary and spelling games.',
    faqs: [
      { q: 'Is LexiClash a free alternative to Kahoot?', a: 'Yes — LexiClash is free for your whole class: 3 classes of up to 50 students, no per-seat fee and no district licence required. Teacher Pro ($9/mo) adds unlimited classes and printable reports. Kahoot! Go Free is harder to size: the schools plans table lists Participant limit 40, while the same-page FAQ “What are the participant limits per game?” says Go up to 10 (kahoot.com/schools/plans). Most classroom-quality features still need Kahoot+ at $4-15/month per teacher.' },
      { q: 'Do students need accounts on LexiClash?', a: 'No. Students join with a 6-character code (just like Kahoot’s PIN system). The difference: LexiClash student accounts are entirely optional, while Kahoot increasingly pushes students toward sign-in for progress tracking.' },
      { q: 'Is LexiClash like Kahoot?', a: 'Different category. Kahoot is a quiz-show platform — students answer multiple-choice questions on a shared timer, often projected on screen. LexiClash is a word-formation game — students search for words on Boggle-style grids, anagrams, or word wheels. Better for vocabulary, spelling, and language practice than multiple-choice trivia.' },
      { q: 'Can I use Kahoot quizzes in LexiClash?', a: 'No — different formats. But you can upload your vocabulary lists from any source (Quizlet exports, CSV, manual entry) and use them in LexiClash word games. For trivia-style quizzes, Kahoot remains the right tool; for word/vocabulary practice, LexiClash is purpose-built.' },
      { q: 'Does LexiClash have multiplayer for a whole class?', a: 'Yes — LexiClash supports up to 50 students per classroom session, all in real time, and a whole class of that size is free — one published free cap. Kahoot! Go Free shows Participant limit 40 in the plans table and “Go up to 10” in the same-page FAQ on kahoot.com/schools/plans; advanced modes and analytics are Kahoot+ only.' },
      { q: 'What are Kahoot! Go Free participant limits — table or FAQ?', a: 'On kahoot.com/schools/plans the Go Free column lists Participant limit 40, but the FAQ “What are the participant limits per game?” on that same page answers “Go: Up to 10 participants per game.” LexiClash publishes a single free classroom limit: 50 students per class (3 classes) — so the plan page and the join code agree.' },
      { q: 'What about ESL or language classrooms?', a: 'LexiClash has built-in dictionaries for English, Hebrew (RTL), Spanish, Swedish, Japanese and Russian — so vocabulary games work natively in each language. Kahoot supports any language for question text but doesn’t have native word-game mechanics tied to language dictionaries.' },
      { q: 'How long is a LexiClash classroom session?', a: 'A whole-class round runs 5-10 minutes. A 1v1 vocabulary duel runs 2-3 minutes. Most teachers use it as a 5-minute warm-up, mid-lesson brain break, or end-of-class review — same use cases Kahoot fills, but with word-formation gameplay instead of quiz format.' },
    ],
    moreComparisons: [
      { title: 'LexiClash vs Quizlet', desc: 'Word games vs flashcards. Free vs Quizlet Plus.' },
      { title: 'LexiClash vs Wordle', desc: 'Unlimited play vs 1 puzzle/day' },
      { title: 'Best Word Games 2026', desc: 'Complete comparison guide' },
    ],
    tryTitle: 'Try it before next class',
    tryBody:
      'Same join-code, same 5-minute slot Kahoot taught classrooms to expect. But word games instead of quizzes, free instead of Kahoot+, and ready in 60 seconds instead of 5. If it’s not for your classroom, you’ve lost five minutes — and gained a tool to keep in mind for vocabulary review days.',
    tryCta: 'Start a Classroom Game Free',
    breadcrumbPage: 'LexiClash vs Kahoot',
  },

  he: {
    h1: 'Kahoot כיפי. אבל לאוצר מילים LexiClash מהיר יותר, חינמי יותר ומבוסס על משחקי מילים.',
    intro:
      'Kahoot שולט ברגע של חידון הכיתה — זה הז׳אנר שלהם והם טובים בו. אבל לאוצר מילים, איות ותרגול שפה הכלי הנכון הוא לא חידון עם תשובות אמריקאיות — אלא משחק יצירת מילים שבו התלמידים באמת מחפשים, בונים ומזהים מילים. LexiClash נבנה בדיוק בשביל זה. כל הכיתה בחינם (בלי מנוי Kahoot+), בלי הרשמה של תלמידים, שש שפות עם מילונים מקוריים, ואותו מהלך כיתתי של 5 דקות ש-Kahoot פתח.',
    rows: [
      ['משחק כיתתי בחינם', '✓ 3 כיתות × 50 תלמידים', '✗ Kahoot+ ב-4–15$ לחודש'],
      ['בלי הרשמת תלמידים', '✓ קוד הצטרפות של 6 תווים', '✓ קוד PIN'],
      ['סוג המשחק', 'יצירת מילים (Boggle / גלגל / אנגרמות)', 'חידון / שאלות אמריקאיות'],
      ['הכי מתאים ל', 'אוצר מילים, איות, לימוד אנגלית', 'טריוויה, שליפת עובדות, חידוני חזרה'],
      ['דו-קרב אחד על אחד', '✓ מובנה', '✗'],
      ['6 שפות עם מילונים מקוריים', '✓ EN/HE/SV/JA/ES/RU', 'טקסט השאלות בכל שפה; בלי מילונים'],
      ['תוכן לימודי מותאם', '✓ רשימות מילים', '✓ שאלות חידון'],
      ['ניתוח נתוני כיתה', 'Teacher Pro (9$ לחודש)', 'מוגבל בחינם; מלא ב-Kahoot+'],
      ['בלי פרסומות בכיתה', '✓ חינם', 'בחינם מופיעות פרסומות; ב-Kahoot+ אין'],
      ['מובייל ודפדפן', 'דפדפן בלבד', 'אפליקציות ואתר'],
      ['משחק רב-משתתפים לכל הכיתה', '✓ עד 50 תלמידים בחינם', 'Go Free: בטבלה 40 / ב-FAQ 10'],
      ['מגבלת משתתפים חינמית (כפי שפורסמה)', '✓ ברורה: 50 לכיתה', 'Go Free: בטבלה 40 מול 10 ב-FAQ (kahoot.com/schools/plans)'],
      ['זמן הכנה', 'פחות מ-60 שניות', '2–5 דקות לחידון'],
    ],
    pricingNote:
      'תמחור Kahoot נכון ל-2026: בטבלת התוכניות של Kahoot! Go Free מופיע Participant limit 40, ואילו ה-FAQ באותו עמוד אומר Go up to 10 (kahoot.com/schools/plans); מסלולי Kahoot+ מעלים את התקרה. בתוכנית החינמית של LexiClash התקרה הכיתתית ברורה: 50 תלמידים בכיתה.',
    beatsTitle: 'מתי LexiClash עדיף על Kahoot',
    beats: [
      { title: 'משחקי מילים, לא חידונים', desc: 'באוצר מילים, איות ותרגול שפה תלמידים צריכים למצוא, לבנות ולזהות מילים — לא לבחור בין א׳, ב׳, ג׳ ו-ד׳. זה אימון חשיבתי אחר, והוא מתאים יותר למטרה.' },
      { title: 'משחק חינם, ו-Teacher Pro לכלי המורה', desc: 'Kahoot דוחף אתכם ל-Kahoot+ בשביל דוחות מתקדמים, משחקים גדולים יותר ומצבים מסוימים. המשחק הכיתתי ב-LexiClash נשאר חינמי: 3 כיתות × 50 תלמידים, בלי הרשמה של תלמידים. Teacher Pro (9$ לחודש) הוא השדרוג בתשלום לכלי המורה — ניתוח נתוני כיתה, דוחות להדפסה ובקרת קצב ולחץ במצב רגוע.' },
      { title: 'תקרת מקומות חינמית אחת ופומבית', desc: 'ב-Kahoot! Go Free מופיע Participant limit 40 בטבלת התוכניות ו-“Go up to 10” ב-FAQ באותו עמוד (kahoot.com/schools/plans). ב-LexiClash החינמי יש תקרה ברורה של 50 תלמידים בכיתה — קוד ההצטרפות תואם לדף התוכניות.' },
      { title: 'מילונים מקוריים בכמה שפות', desc: 'לכיתות אנגלית כשפה זרה, לשיעורי עברית ולכיתות דו-לשוניות בספרדית — ל-LexiClash יש מילונים מלאים ב-6 שפות. Kahoot תומך בכל טקסט אבל אין בו מנגנוני משחק שפה.' },
      { title: 'דו-קרבי אוצר מילים אחד על אחד', desc: 'מזווגים תלמידים לקרב מילים של 2–3 דקות, פנים מול פנים. הפורמט של Kahoot לא תומך בתרגול בזוגות באותה צורה.' },
      { title: 'הכנה מהירה יותר', desc: 'כתיבת חידון ב-Kahoot לוקחת 2–5 דקות. רשימות מילים ב-LexiClash מועלות תוך פחות מדקה, ורבים מהמורים משתמשים ברשימות מובנות כדי להתחיל לשחק מיד.' },
      { title: 'כיתה בלי פרסומות', desc: 'ב-Kahoot החינמי מדי פעם מוצגות לתלמידים פרסומות. מצב הכיתה של LexiClash נקי מפרסומות בכל המסלולים.' },
    ],
    winsTitle: 'מתי Kahoot עדיין מנצח',
    wins:
      'Kahoot נבנה לטריוויה, לחידוני חזרה וללמידה שמונחית מצגת. אם המטרה היא לבחון תלמידים בעובדות היסטוריות, באוצר מילים מדעי בצורת שאלה או בחזרה אמריקאית בסוף יחידה, הפורמט של Kahoot בנוי בדיוק לזה. LexiClash מתאים יותר לאיות אוצר מילים, זיהוי דפוסי שפה, תרגול אנגלית כשפה זרה ומשחקי יצירת מילים. מורים רבים משתמשים בשניהם: Kahoot לחזרה על עובדות, ו-LexiClash למשחקי אוצר מילים ואיות.',
    faqs: [
      { q: 'האם LexiClash הוא חלופה חינמית ל-Kahoot?', a: 'כן — LexiClash חינמי לכל הכיתה: 3 כיתות של עד 50 תלמידים, בלי תשלום לכל מקום ובלי רישיון מחוזי. Teacher Pro (9$ לחודש) מוסיף כיתות ללא הגבלה ודוחות להדפסה. את Kahoot! Go Free קשה יותר להעריך: בטבלת התוכניות לבתי ספר מופיע Participant limit 40, ואילו ב-FAQ “What are the participant limits per game?” באותו עמוד כתוב Go up to 10 (kahoot.com/schools/plans). רוב התכונות ברמת כיתה עדיין דורשות Kahoot+ ב-4–15$ לחודש למורה.' },
      { q: 'האם תלמידים צריכים חשבון ב-LexiClash?', a: 'לא. התלמידים מצטרפים עם קוד של 6 תווים (בדומה למערכת ה-PIN של Kahoot). ההבדל: חשבונות תלמיד ב-LexiClash הם אופציונליים לגמרי, ואילו Kahoot דוחף יותר ויותר להתחברות כדי לעקוב אחר התקדמות.' },
      { q: 'האם LexiClash דומה ל-Kahoot?', a: 'זו קטגוריה אחרת. Kahoot הוא פלטפורמת חידונים — התלמידים עונים על שאלות אמריקאיות מול שעון משותף, לרוב על מסך מוקרן. LexiClash הוא משחק יצירת מילים — התלמידים מחפשים מילים ברשתות בסגנון Boggle, באנגרמות או בגלגלי מילים. הוא מתאים יותר לאוצר מילים, לאיות ולתרגול שפה מאשר טריוויה אמריקאית.' },
      { q: 'אפשר להשתמש בחידוני Kahoot ב-LexiClash?', a: 'לא — אלה פורמטים שונים. אבל אפשר להעלות רשימות אוצר מילים מכל מקור (ייצוא מ-Quizlet, CSV, הקלדה ידנית) ולהשתמש בהן במשחקי המילים של LexiClash. לחידוני טריוויה Kahoot נשאר הכלי הנכון; לתרגול מילים ואוצר מילים LexiClash בנוי בדיוק בשביל זה.' },
      { q: 'האם ב-LexiClash אפשר לשחק עם כל הכיתה יחד?', a: 'כן — LexiClash תומך בעד 50 תלמידים בכל מפגש כיתה, הכול בזמן אמת, וכיתה שלמה בגודל הזה חינמית — תקרה חינמית אחת ופומבית. ב-Kahoot! Go Free מופיע Participant limit 40 בטבלת התוכניות ו-“Go up to 10” ב-FAQ באותו עמוד ב-kahoot.com/schools/plans; מצבים מתקדמים וניתוח נתונים זמינים רק ב-Kahoot+.' },
      { q: 'מה מגבלת המשתתפים ב-Kahoot! Go Free — הטבלה או ה-FAQ?', a: 'ב-kahoot.com/schools/plans בעמודת Go Free כתוב Participant limit 40, אבל ה-FAQ “What are the participant limits per game?” באותו עמוד עונה “Go: Up to 10 participants per game.” ב-LexiClash מפורסמת מגבלת כיתה חינמית אחת: 50 תלמידים בכיתה (3 כיתות) — כך שדף התוכניות וקוד ההצטרפות תואמים.' },
      { q: 'ומה לגבי כיתות אנגלית או כיתות שפה?', a: 'ל-LexiClash יש מילונים מובנים באנגלית, עברית (מימין לשמאל), ספרדית, שוודית, יפנית ורוסית — כך שמשחקי אוצר המילים עובדים באופן טבעי בכל שפה. Kahoot תומך בכל שפה בטקסט השאלות, אבל אין בו מנגנוני משחק מילים שקשורים למילוני שפה.' },
      { q: 'כמה זמן נמשך מפגש כיתה ב-LexiClash?', a: 'סבב לכל הכיתה נמשך 5–10 דקות. דו-קרב אוצר מילים אחד על אחד נמשך 2–3 דקות. רוב המורים משתמשים בו כחימום של 5 דקות, כהפסקת מוח באמצע השיעור או כחזרה בסוף השיעור — אותם שימושים ש-Kahoot ממלא, אבל עם משחק יצירת מילים במקום חידון.' },
    ],
    moreComparisons: [
      { title: 'LexiClash מול Quizlet', desc: 'משחקי מילים מול כרטיסיות. חינם מול Quizlet Plus.' },
      { title: 'LexiClash מול Wordle', desc: 'משחק בלי הגבלה מול חידה אחת ביום' },
      { title: 'משחקי המילים הטובים ביותר ב-2026', desc: 'מדריך השוואה מלא' },
    ],
    tryTitle: 'נסו לפני השיעור הבא',
    tryBody:
      'אותו קוד הצטרפות, ואותם 5 דקות ש-Kahoot לימד כיתות לצפות להן. אבל משחקי מילים במקום חידונים, בחינם במקום Kahoot+, ומוכן תוך 60 שניות במקום 5 דקות. אם זה לא מתאים לכיתה שלכם, הפסדתם חמש דקות — והרווחתם כלי לזכור לימי חזרה על אוצר מילים.',
    tryCta: 'התחילו משחק כיתתי בחינם',
    breadcrumbPage: 'LexiClash מול Kahoot',
  },

  es: {
    h1: 'Kahoot es divertido. Para vocabulario, LexiClash es más rápido, más gratuito y nativo del juego de palabras.',
    intro:
      'Kahoot domina el momento del concurso en el aula: es su género y lo hacen muy bien. Pero para vocabulario, ortografía y práctica de idiomas, la herramienta adecuada no es un cuestionario de opción múltiple, sino un juego de formar palabras en el que el alumnado busca, construye y reconoce palabras de verdad. LexiClash está hecho justo para eso. Toda la clase gratis (sin suscripción a Kahoot+), sin registro del alumnado, seis idiomas con diccionarios nativos y el mismo ritmo de 5 minutos que popularizó Kahoot.',
    rows: [
      ['Juego en clase gratis', '✓ 3 clases × 50 estudiantes', '✗ Kahoot+ 4-15 $/mes'],
      ['Sin registro del alumnado', '✓ Código de 6 caracteres', '✓ Código PIN'],
      ['Tipo de juego', 'Formación de palabras (Boggle/Rueda/Anagramas)', 'Cuestionario / opción múltiple'],
      ['Ideal para', 'Vocabulario, ortografía, ESL', 'Trivia, memoria de datos, cuestionarios de repaso'],
      ['Duelos 1 contra 1', '✓ Incluidos', '✗'],
      ['6 idiomas con diccionarios nativos', '✓ EN/HE/SV/JA/ES/RU', 'Texto de las preguntas en cualquier idioma; sin diccionarios'],
      ['Contenido propio del currículo', '✓ Listas de palabras', '✓ Preguntas de cuestionario'],
      ['Analíticas de clase', 'Teacher Pro (9 $/mes)', 'Limitadas gratis; completas en Kahoot+'],
      ['Sin anuncios en el aula', '✓ Gratis', 'La versión gratis muestra promociones; Kahoot+ no'],
      ['Móvil + navegador', 'Solo navegador', 'Apps + web'],
      ['Multijugador para toda la clase', '✓ Hasta 50 estudiantes gratis', 'Go Free: 40 en la tabla / 10 en las FAQ'],
      ['Límite gratuito de participantes (publicado)', '✓ Claro: 50 por clase', 'Go Free: 40 en la tabla frente a 10 en las FAQ (kahoot.com/schools/plans)'],
      ['Tiempo de preparación', 'Menos de 60 segundos', '2-5 minutos por cuestionario'],
    ],
    pricingNote:
      'Precios de Kahoot en 2026: Kahoot! Go Free indica Participant limit 40 en la tabla de planes, mientras que las FAQ de la misma página dicen Go up to 10 (kahoot.com/schools/plans); los niveles de Kahoot+ suben el límite. El límite gratuito de LexiClash es claro: 50 estudiantes por clase.',
    beatsTitle: 'Cuándo LexiClash supera a Kahoot',
    beats: [
      { title: 'Juegos de palabras, no cuestionarios', desc: 'Para vocabulario, ortografía y práctica de idiomas, el alumnado necesita encontrar, construir y reconocer palabras, no elegir entre A/B/C/D. Es un ejercicio mental distinto y encaja mejor con el objetivo.' },
      { title: 'Juego gratis y Teacher Pro para las herramientas docentes', desc: 'Kahoot te empuja a Kahoot+ para informes avanzados, partidas más grandes y ciertos modos. El juego en clase de LexiClash sigue siendo gratis: 3 clases × 50 estudiantes, sin registro del alumnado. Teacher Pro (9 $/mes) es la mejora de pago para las herramientas docentes: analíticas de clase, informes imprimibles y controles de presión en modo calma.' },
      { title: 'Un único límite gratuito publicado', desc: 'Kahoot! Go Free muestra Participant limit 40 en la tabla de planes y “Go up to 10” en las FAQ de la misma página (kahoot.com/schools/plans). LexiClash gratis ofrece un límite claro de 50 estudiantes por clase: el código de acceso coincide con la página de planes.' },
      { title: 'Diccionarios nativos en varios idiomas', desc: 'Para ESL/EFL, inmersión en hebreo o aulas bilingües de español, LexiClash tiene diccionarios completos en 6 idiomas. Kahoot admite cualquier texto, pero no tiene mecánicas de juego de idiomas.' },
      { title: 'Duelos de vocabulario 1 contra 1', desc: 'Empareja al alumnado para batallas de palabras cara a cara de 2-3 minutos. El formato de Kahoot no permite practicar por parejas de la misma manera.' },
      { title: 'Preparación más rápida', desc: 'Crear un cuestionario de Kahoot lleva 2-5 minutos. Las listas de palabras de LexiClash se suben en menos de un minuto, y muchos docentes usan las listas integradas para jugar al instante.' },
      { title: 'Aula sin anuncios', desc: 'Kahoot gratis muestra de vez en cuando promociones al alumnado. El modo clase de LexiClash no tiene anuncios en ningún plan.' },
    ],
    winsTitle: 'Cuándo Kahoot sigue ganando',
    wins:
      'Kahoot está pensado para trivia, cuestionarios de repaso y aprendizaje guiado por presentaciones. Si tu objetivo es examinar datos de historia, vocabulario científico en forma de pregunta o un repaso de opción múltiple al final de la unidad, el formato de Kahoot está hecho para eso. LexiClash encaja mejor con la ortografía del vocabulario, el reconocimiento de patrones del idioma, la práctica de ESL/EFL y los juegos de formar palabras. Muchos docentes usan ambos: Kahoot para repasar datos y LexiClash para juegos de vocabulario y ortografía.',
    faqs: [
      { q: '¿Es LexiClash una alternativa gratuita a Kahoot?', a: 'Sí: LexiClash es gratis para toda tu clase, con 3 clases de hasta 50 estudiantes, sin cuota por plaza y sin licencia de distrito. Teacher Pro (9 $/mes) añade clases ilimitadas e informes imprimibles. Kahoot! Go Free es más difícil de dimensionar: la tabla de planes para escuelas indica Participant limit 40, mientras que las FAQ “What are the participant limits per game?” de la misma página dicen Go up to 10 (kahoot.com/schools/plans). La mayoría de las funciones de calidad para el aula siguen requiriendo Kahoot+ por 4-15 $ al mes por docente.' },
      { q: '¿Necesita el alumnado una cuenta en LexiClash?', a: 'No. El alumnado se une con un código de 6 caracteres (como el sistema de PIN de Kahoot). La diferencia: las cuentas de estudiante de LexiClash son totalmente opcionales, mientras que Kahoot empuja cada vez más a iniciar sesión para seguir el progreso.' },
      { q: '¿Se parece LexiClash a Kahoot?', a: 'Es otra categoría. Kahoot es una plataforma de concursos: el alumnado responde preguntas de opción múltiple con un temporizador compartido, a menudo proyectado en pantalla. LexiClash es un juego de formar palabras: se buscan palabras en cuadrículas estilo Boggle, anagramas o ruedas de palabras. Funciona mejor para vocabulario, ortografía y práctica de idiomas que la trivia de opción múltiple.' },
      { q: '¿Puedo usar cuestionarios de Kahoot en LexiClash?', a: 'No, son formatos distintos. Pero puedes subir tus listas de vocabulario de cualquier origen (exportaciones de Quizlet, CSV, entrada manual) y usarlas en los juegos de palabras de LexiClash. Para cuestionarios de trivia, Kahoot sigue siendo la herramienta adecuada; para practicar palabras y vocabulario, LexiClash está hecho a propósito.' },
      { q: '¿Tiene LexiClash multijugador para toda la clase?', a: 'Sí: LexiClash admite hasta 50 estudiantes por sesión de clase, todos en tiempo real, y una clase completa de ese tamaño es gratis, con un único límite gratuito publicado. Kahoot! Go Free muestra Participant limit 40 en la tabla de planes y “Go up to 10” en las FAQ de la misma página de kahoot.com/schools/plans; los modos avanzados y las analíticas son solo de Kahoot+.' },
      { q: '¿Cuál es el límite de participantes de Kahoot! Go Free: el de la tabla o el de las FAQ?', a: 'En kahoot.com/schools/plans la columna Go Free indica Participant limit 40, pero las FAQ “What are the participant limits per game?” de esa misma página responden “Go: Up to 10 participants per game.” LexiClash publica un único límite gratuito por clase: 50 estudiantes (3 clases), así que la página de planes y el código de acceso coinciden.' },
      { q: '¿Y las clases de ESL o de idiomas?', a: 'LexiClash tiene diccionarios integrados para inglés, hebreo (de derecha a izquierda), español, sueco, japonés y ruso, así que los juegos de vocabulario funcionan de forma nativa en cada idioma. Kahoot admite cualquier idioma en el texto de las preguntas, pero no tiene mecánicas de juego de palabras ligadas a diccionarios de idiomas.' },
      { q: '¿Cuánto dura una sesión de clase en LexiClash?', a: 'Una ronda para toda la clase dura 5-10 minutos. Un duelo de vocabulario 1 contra 1 dura 2-3 minutos. La mayoría de los docentes lo usan como calentamiento de 5 minutos, pausa mental a mitad de clase o repaso al final: los mismos usos que cubre Kahoot, pero con juego de formar palabras en lugar de cuestionario.' },
    ],
    moreComparisons: [
      { title: 'LexiClash vs Quizlet', desc: 'Juegos de palabras frente a tarjetas. Gratis frente a Quizlet Plus.' },
      { title: 'LexiClash vs Wordle', desc: 'Juego ilimitado frente a 1 palabra al día' },
      { title: 'Mejores juegos de palabras 2026', desc: 'Guía comparativa completa' },
    ],
    tryTitle: 'Pruébalo antes de la próxima clase',
    tryBody:
      'El mismo código de acceso y el mismo hueco de 5 minutos al que Kahoot acostumbró a las aulas. Pero con juegos de palabras en lugar de cuestionarios, gratis en lugar de Kahoot+ y listo en 60 segundos en lugar de 5 minutos. Si no encaja con tu clase, habrás perdido cinco minutos y habrás ganado una herramienta para los días de repaso de vocabulario.',
    tryCta: 'Empezar una partida de clase gratis',
    breadcrumbPage: 'LexiClash vs Kahoot',
  },

  sv: {
    h1: 'Kahoot är kul. För ordförråd är LexiClash snabbare, billigare och byggt kring ordspel.',
    intro:
      'Kahoot äger quizögonblicket i klassrummet — det är deras genre och de är bra på den. Men för ordförråd, stavning och språkträning är rätt verktyg inte ett quiz med flervalsfrågor, utan ett ordspel där eleverna på riktigt letar efter, bygger och känner igen ord. LexiClash är byggt för just det. Hela klassen gratis (ingen Kahoot+-prenumeration), ingen elevregistrering, sex språk med inbyggda ordlistor och samma klassrumsflöde på 5 minuter som Kahoot gjorde till standard.',
    rows: [
      ['Gratis klassrumsspel', '✓ 3 klasser × 50 elever', '✗ Kahoot+ 4–15 USD/mån'],
      ['Ingen elevregistrering', '✓ Anslutningskod med 6 tecken', '✓ PIN-kod'],
      ['Speltyp', 'Ordbildning (Boggle/Hjul/Anagram)', 'Quiz / flerval'],
      ['Bäst för', 'Ordförråd, stavning, engelska som andraspråk', 'Allmänbildning, faktaminne, repetitionsquiz'],
      ['Duell 1 mot 1', '✓ Inbyggt', '✗'],
      ['6 språk med inbyggda ordlistor', '✓ EN/HE/SV/JA/ES/RU', 'Frågetext på valfritt språk; inga ordlistor'],
      ['Eget kursinnehåll', '✓ Ordlistor', '✓ Quizfrågor'],
      ['Klassanalys', 'Teacher Pro (9 USD/mån)', 'Begränsat gratis; fullt i Kahoot+'],
      ['Reklamfritt klassrum', '✓ Gratis', 'Gratisversionen visar kampanjer; Kahoot+ är reklamfritt'],
      ['Mobil + webbläsare', 'Endast webbläsare', 'Appar + webb'],
      ['Flerspelarläge för hela klassen', '✓ Upp till 50 elever gratis', 'Go Free: 40 i tabellen / 10 i FAQ'],
      ['Gratisgräns för deltagare (publicerad)', '✓ Tydlig: 50 per klass', 'Go Free: 40 i tabellen mot 10 i FAQ (kahoot.com/schools/plans)'],
      ['Förberedelsetid', 'Under 60 sekunder', '2–5 minuter per quiz'],
    ],
    pricingNote:
      'Kahoots priser 2026: Kahoot! Go Free anger Participant limit 40 i plantabellen medan FAQ på samma sida säger Go up to 10 (kahoot.com/schools/plans); Kahoot+-nivåerna höjer gränsen. LexiClashs gratisgräns är tydlig: 50 elever per klass.',
    beatsTitle: 'När LexiClash slår Kahoot',
    beats: [
      { title: 'Ordspel, inte quiz', desc: 'För ordförråd, stavning och språkträning behöver eleverna hitta, bygga och känna igen ord — inte välja mellan A/B/C/D. Det är en annan sorts hjärngympa och passar målet bättre.' },
      { title: 'Gratis spel, Teacher Pro för lärarverktyg', desc: 'Kahoot knuffar dig mot Kahoot+ för avancerade rapporter, större spel och vissa lägen. Klassrumsspel i LexiClash förblir gratis: 3 klasser × 50 elever, ingen elevregistrering. Teacher Pro (9 USD/mån) är den betalda uppgraderingen för lärarverktyg — klassanalys, utskrivbara rapporter och reglage för tempo och tryck i lugnt läge.' },
      { title: 'En enda publicerad gratisgräns', desc: 'Kahoot! Go Free visar Participant limit 40 i plantabellen och ”Go up to 10” i FAQ på samma sida (kahoot.com/schools/plans). LexiClash gratis har en tydlig gräns på 50 elever per klass — anslutningskoden stämmer med plansidan.' },
      { title: 'Inbyggda ordlistor på flera språk', desc: 'För engelska som främmande språk, hebreiska och tvåspråkiga spanska klassrum har LexiClash fullständiga ordlistor på 6 språk. Kahoot klarar vilken text som helst men saknar spelmekanik för språk.' },
      { title: 'Ordduell 1 mot 1', desc: 'Para ihop eleverna i ordstrider på 2–3 minuter, ansikte mot ansikte. Kahoots format stöder inte parövningar på samma sätt.' },
      { title: 'Snabbare förberedelse', desc: 'Det tar 2–5 minuter att skriva ett quiz i Kahoot. Ordlistor laddas upp i LexiClash på under en minut, och många lärare använder de inbyggda listorna för att komma igång direkt.' },
      { title: 'Reklamfritt klassrum', desc: 'Gratisversionen av Kahoot visar ibland kampanjer för eleverna. Klassrumsläget i LexiClash är reklamfritt i alla nivåer.' },
    ],
    winsTitle: 'När Kahoot fortfarande vinner',
    wins:
      'Kahoot är byggt för allmänbildning, repetitionsquiz och presentationsstyrt lärande. Om målet är att testa eleverna på historiska fakta, naturvetenskapliga begrepp i frågeform eller flervalsrepetition i slutet av ett område är Kahoots format gjort för det. LexiClash passar bättre för stavning av ordförråd, igenkänning av språkmönster, träning i engelska som främmande språk och ordbildningsspel. Många lärare använder båda: Kahoot för faktarepetition och LexiClash för ordförråds- och stavningsspel.',
    faqs: [
      { q: 'Är LexiClash ett gratis alternativ till Kahoot?', a: 'Ja — LexiClash är gratis för hela klassen: 3 klasser med upp till 50 elever, ingen avgift per plats och ingen distriktslicens. Teacher Pro (9 USD/mån) ger obegränsat antal klasser och utskrivbara rapporter. Kahoot! Go Free är svårare att bedöma: plantabellen för skolor anger Participant limit 40, medan FAQ ”What are the participant limits per game?” på samma sida säger Go up to 10 (kahoot.com/schools/plans). De flesta funktioner av klassrumskvalitet kräver fortfarande Kahoot+ för 4–15 USD per månad och lärare.' },
      { q: 'Behöver eleverna konton i LexiClash?', a: 'Nej. Eleverna ansluter med en kod på 6 tecken (precis som Kahoots PIN-system). Skillnaden: elevkonton i LexiClash är helt frivilliga, medan Kahoot allt oftare styr eleverna mot inloggning för att följa framsteg.' },
      { q: 'Är LexiClash som Kahoot?', a: 'Det är en annan kategori. Kahoot är en quizplattform — eleverna svarar på flervalsfrågor mot en gemensam timer, ofta visad på storbild. LexiClash är ett ordbildningsspel — eleverna letar efter ord i rutnät i Boggle-stil, anagram eller ordhjul. Det passar bättre för ordförråd, stavning och språkträning än flervalsfrågor.' },
      { q: 'Kan jag använda Kahoot-quiz i LexiClash?', a: 'Nej — det är olika format. Men du kan ladda upp dina ordlistor från vilken källa som helst (Quizlet-exporter, CSV, manuell inmatning) och använda dem i LexiClashs ordspel. För quiz med allmänbildning är Kahoot fortfarande rätt verktyg; för ord- och ordförrådsträning är LexiClash byggt för uppgiften.' },
      { q: 'Har LexiClash flerspelarläge för hela klassen?', a: 'Ja — LexiClash stöder upp till 50 elever per klassrumssession, alla i realtid, och en hel klass av den storleken är gratis — en enda publicerad gratisgräns. Kahoot! Go Free visar Participant limit 40 i plantabellen och ”Go up to 10” i FAQ på samma sida på kahoot.com/schools/plans; avancerade lägen och analys finns bara i Kahoot+.' },
      { q: 'Vad är deltagargränsen i Kahoot! Go Free — tabellen eller FAQ?', a: 'På kahoot.com/schools/plans anger kolumnen Go Free Participant limit 40, men FAQ ”What are the participant limits per game?” på samma sida svarar ”Go: Up to 10 participants per game.” LexiClash publicerar en enda gratisgräns per klass: 50 elever (3 klasser) — så plansidan och anslutningskoden stämmer överens.' },
      { q: 'Hur fungerar det för engelska som andraspråk och språkklassrum?', a: 'LexiClash har inbyggda ordlistor för engelska, hebreiska (höger till vänster), spanska, svenska, japanska och ryska — så ordförrådsspelen fungerar naturligt på varje språk. Kahoot stöder alla språk i frågetexten men saknar ordspelsmekanik kopplad till språkens ordlistor.' },
      { q: 'Hur lång är en klassrumssession i LexiClash?', a: 'En omgång för hela klassen tar 5–10 minuter. En ordduell 1 mot 1 tar 2–3 minuter. De flesta lärare använder det som 5 minuters uppvärmning, hjärnpaus mitt i lektionen eller repetition i slutet — samma användning som Kahoot fyller, men med ordbildning i stället för quiz.' },
    ],
    moreComparisons: [
      { title: 'LexiClash vs Quizlet', desc: 'Ordspel mot flashcards. Gratis mot Quizlet Plus.' },
      { title: 'LexiClash vs Wordle', desc: 'Obegränsat spelande mot 1 pussel per dag' },
      { title: 'Bästa ordspelen 2026', desc: 'Komplett jämförelseguide' },
    ],
    tryTitle: 'Testa före nästa lektion',
    tryBody:
      'Samma anslutningskod och samma 5-minutersfönster som Kahoot lärde klassrum att förvänta sig. Men ordspel i stället för quiz, gratis i stället för Kahoot+ och klart på 60 sekunder i stället för 5 minuter. Om det inte passar din klass har du förlorat fem minuter — och fått ett verktyg att komma ihåg till repetitionsdagar för ordförråd.',
    tryCta: 'Starta ett klassrumsspel gratis',
    breadcrumbPage: 'LexiClash vs Kahoot',
  },

  ja: {
    h1: 'Kahootは楽しいツールです。でも語彙学習なら、LexiClashのほうが手早く、無料で、単語ゲームそのものです。',
    intro:
      'クイズ番組のような教室の盛り上がりはKahootの得意分野で、そこは本当によくできています。ただ、語彙・スペル・言語練習に向いているのは、選択式クイズではなく、生徒が自分で単語を探し、組み立て、見分ける単語づくりのゲームです。LexiClashはまさにそのために作られました。クラス全員が無料（Kahoot+の購読は不要）、生徒の登録も不要、ネイティブ辞書つきの6言語、そしてKahootが広めた5分間の授業の流れもそのまま使えます。',
    rows: [
      ['クラスでの無料プレイ', '✓ 3クラス × 50人', '✗ Kahoot+ は月4〜15ドル'],
      ['生徒の登録不要', '✓ 6文字の参加コード', '✓ PINコード'],
      ['ゲームの種類', '単語づくり（Boggle／ホイール／アナグラム）', 'クイズ／選択式'],
      ['向いている用途', '語彙、スペル、英語学習（ESL）', '雑学、知識の確認、復習クイズ'],
      ['1対1の対戦', '✓ 標準搭載', '✗'],
      ['ネイティブ辞書つきの6言語', '✓ EN/HE/SV/JA/ES/RU', '問題文はどの言語でも可。辞書はなし'],
      ['カリキュラムに合わせた内容', '✓ 単語リスト', '✓ クイズの問題'],
      ['クラスの分析', 'Teacher Pro（月9ドル）', '無料は一部のみ。全機能はKahoot+'],
      ['教室で広告なし', '✓ 無料', '無料版は宣伝が表示。Kahoot+は広告なし'],
      ['モバイル＋ブラウザ', 'ブラウザのみ', 'アプリ＋ウェブ'],
      ['クラス全員での同時プレイ', '✓ 無料で最大50人', 'Go Free：表では40／FAQでは10'],
      ['無料の参加人数上限（公表値）', '✓ 明確：1クラス50人', 'Go Free：表は40、FAQは10（kahoot.com/schools/plans）'],
      ['準備にかかる時間', '60秒未満', 'クイズ1つにつき2〜5分'],
    ],
    pricingNote:
      '2026年時点のKahoot料金：Kahoot! Go Freeはプラン表でParticipant limit 40と記載されていますが、同じページのFAQではGo up to 10とされています（kahoot.com/schools/plans）。Kahoot+の各プランで上限は上がります。LexiClashの無料クラス上限は、1クラス50人とはっきりしています。',
    beatsTitle: 'LexiClashがKahootより向いている場面',
    beats: [
      { title: 'クイズではなく単語ゲーム', desc: '語彙・スペル・言語練習では、A/B/C/Dから選ぶのではなく、単語を見つけ、組み立て、見分ける力が必要です。頭の使い方が違うぶん、目的にもよく合います。' },
      { title: '遊ぶのは無料、先生向けの道具はTeacher Pro', desc: 'Kahootでは、詳しいレポート、大人数のゲーム、一部のモードのためにKahoot+へ誘導されます。LexiClashのクラスプレイは無料のままで、3クラス × 50人、生徒の登録も不要です。Teacher Pro（月9ドル）は先生向けの有料アップグレードで、クラスの分析、印刷できるレポート、落ち着いたモードでの緊張感の調整ができます。' },
      { title: '無料の人数上限が1つだけ', desc: 'Kahoot! Go Freeは、プラン表ではParticipant limit 40、同じページのFAQでは「Go up to 10」と書かれています（kahoot.com/schools/plans）。LexiClashの無料版は1クラス50人とはっきりしていて、参加コードとプランページの内容が一致します。' },
      { title: 'ネイティブ辞書で多言語に対応', desc: '英語学習（ESL/EFL）、ヘブライ語の没入授業、スペイン語のバイリンガル学級でも、LexiClashには6言語の完全な辞書があります。Kahootはどんな文章も扱えますが、言語ゲームの仕組みはありません。' },
      { title: '1対1の語彙バトル', desc: '生徒を2人1組にして、2〜3分の単語対決ができます。Kahootの形式では、ペアでの練習は同じようにはできません。' },
      { title: '準備が早い', desc: 'Kahootのクイズは作るのに1つ2〜5分かかります。LexiClashの単語リストは1分かからずにアップロードでき、組み込みのリストを使えばすぐに遊べるため、そうする先生も多くいます。' },
      { title: '広告のない教室', desc: 'Kahootの無料版では、ときどき生徒に宣伝が表示されます。LexiClashの教室モードは、どのプランでも広告なしです。' },
    ],
    winsTitle: 'それでもKahootが強い場面',
    wins:
      'Kahootは、雑学、復習クイズ、プレゼン中心の授業のために作られています。歴史の知識、問題形式の理科用語、単元末の選択式の復習などを出題したいなら、Kahootの形式はまさにそのためのものです。LexiClashは、語彙のスペル、言語パターンの認識、ESL/EFLの練習、単語づくりのゲームに向いています。多くの先生は両方を使い分けていて、知識の復習にはKahoot、語彙とスペルのゲームにはLexiClashを使っています。',
    faqs: [
      { q: 'LexiClashはKahootの無料の代わりになりますか？', a: 'はい。LexiClashはクラス全員が無料で使えます。最大50人のクラスを3つまで、席ごとの料金も学区ライセンスも不要です。Teacher Pro（月9ドル）では、クラス数が無制限になり、印刷できるレポートも使えます。Kahoot! Go Freeは人数の見積もりが難しく、学校向けプラン表ではParticipant limit 40ですが、同じページのFAQ「What are the participant limits per game?」ではGo up to 10とあります（kahoot.com/schools/plans）。教室で役立つ機能の多くは、いまもKahoot+（先生1人あたり月4〜15ドル）が必要です。' },
      { q: 'LexiClashでは生徒のアカウントが必要ですか？', a: 'いいえ。生徒は6文字のコードで参加します（KahootのPINと同じ仕組みです）。違いは、LexiClashの生徒アカウントは完全に任意なのに対し、Kahootは進捗の記録のためにサインインを求める場面が増えていることです。' },
      { q: 'LexiClashはKahootと似ていますか？', a: '種類が違います。Kahootはクイズ番組型のプラットフォームで、生徒が共通のタイマーのもと、多くは画面に映した選択式の問題に答えます。LexiClashは単語づくりのゲームで、Boggle風のマス目、アナグラム、ワードホイールから単語を探します。選択式の雑学よりも、語彙、スペル、言語練習に向いています。' },
      { q: 'Kahootのクイズを LexiClash で使えますか？', a: 'いいえ、形式が違うため使えません。ただし、語彙リストはどこで作ったもの（Quizletの書き出し、CSV、手入力）でもアップロードして、LexiClashの単語ゲームで使えます。雑学型のクイズにはこれからもKahootが適しており、単語や語彙の練習にはLexiClashが専用に作られています。' },
      { q: 'LexiClashはクラス全員で対戦できますか？', a: 'はい。1回の授業で最大50人がリアルタイムで一緒に遊べて、その人数のクラス全員が無料です（公表されている無料の上限は1つだけ）。Kahoot! Go Freeは、kahoot.com/schools/plansのプラン表でParticipant limit 40、同じページのFAQで「Go up to 10」と書かれています。高度なモードや分析はKahoot+のみです。' },
      { q: 'Kahoot! Go Freeの参加人数の上限は、表とFAQのどちらが正しいのですか？', a: 'kahoot.com/schools/plansのGo Free欄にはParticipant limit 40とありますが、同じページのFAQ「What are the participant limits per game?」には「Go: Up to 10 participants per game.」と答えが出ています。LexiClashが公表している無料のクラス上限は1つだけで、1クラス50人（3クラス）です。プランページと参加コードの内容が一致しています。' },
      { q: '英語学習（ESL）や語学の授業ではどうですか？', a: 'LexiClashには、英語、ヘブライ語（右から左）、スペイン語、スウェーデン語、日本語、ロシア語の辞書が組み込まれているので、語彙ゲームはどの言語でもそのまま使えます。Kahootは問題文をどの言語でも書けますが、言語の辞書と結びついた単語ゲームの仕組みはありません。' },
      { q: 'LexiClashの授業は何分くらいですか？', a: 'クラス全員で遊ぶ1ラウンドは5〜10分、1対1の語彙バトルは2〜3分です。多くの先生は、5分間のウォームアップ、授業中の気分転換、授業の最後の復習として使っています。Kahootと同じ使い方ですが、クイズ形式ではなく単語づくりのゲームになります。' },
    ],
    moreComparisons: [
      { title: 'LexiClash と Quizlet の比較', desc: '単語ゲームとフラッシュカード。無料とQuizlet Plusの違い。' },
      { title: 'LexiClash と Wordle の比較', desc: '無制限に遊べるか、1日1問か' },
      { title: '2026年のおすすめ単語ゲーム', desc: 'まとめて比べられる総合ガイド' },
    ],
    tryTitle: '次の授業の前に試してみましょう',
    tryBody:
      '参加コードも、Kahootが教室に根づかせた5分間の枠も同じです。違うのは、クイズではなく単語ゲームで、Kahoot+ではなく無料で、準備が5分ではなく60秒で済むことです。もしクラスに合わなくても、失うのは5分だけ。語彙の復習の日に思い出せる道具が1つ増えます。',
    tryCta: 'クラス用ゲームを無料で始める',
    breadcrumbPage: 'LexiClash と Kahoot の比較',
  },

  ru: {
    h1: 'Kahoot — это весело. Но для словарного запаса LexiClash быстрее, свободнее и создан именно для словесных игр.',
    intro:
      'Kahoot владеет атмосферой викторины в классе — это их жанр, и они в нём сильны. Но для словарного запаса, правописания и языковой практики подходит не викторина с вариантами ответов, а игра на составление слов, где ученики сами ищут, собирают и узнают слова. LexiClash создан именно для этого. Весь класс бесплатно (без подписки Kahoot+), без регистрации учеников, шесть языков с родными словарями и тот же пятиминутный формат урока, который популяризировал Kahoot.',
    rows: [
      ['Бесплатная игра в классе', '✓ 3 класса × 50 учеников', '✗ Kahoot+ 4–15 $/мес.'],
      ['Без регистрации учеников', '✓ Код входа из 6 символов', '✓ PIN-код'],
      ['Тип игры', 'Составление слов (Boggle / колесо / анаграммы)', 'Викторина / выбор ответа'],
      ['Лучше всего подходит для', 'Словарного запаса, правописания, изучения английского', 'Викторин, запоминания фактов, проверочных тестов'],
      ['Дуэли 1 на 1', '✓ Встроены', '✗'],
      ['6 языков с родными словарями', '✓ EN/HE/SV/JA/ES/RU', 'Текст вопросов на любом языке; словарей нет'],
      ['Свой учебный материал', '✓ Списки слов', '✓ Вопросы викторины'],
      ['Аналитика класса', 'Teacher Pro (9 $/мес.)', 'Ограниченная бесплатно; полная в Kahoot+'],
      ['Без рекламы в классе', '✓ Бесплатно', 'В бесплатной версии есть промо; в Kahoot+ рекламы нет'],
      ['Мобильное приложение и браузер', 'Только браузер', 'Приложения и веб'],
      ['Мультиплеер для всего класса', '✓ До 50 учеников бесплатно', 'Go Free: 40 в таблице / 10 в FAQ'],
      ['Бесплатный лимит участников (как опубликован)', '✓ Чётко: 50 на класс', 'Go Free: 40 в таблице против 10 в FAQ (kahoot.com/schools/plans)'],
      ['Время подготовки', 'Меньше 60 секунд', '2–5 минут на одну викторину'],
    ],
    pricingNote:
      'Цены Kahoot на 2026 год: в таблице планов Kahoot! Go Free указано Participant limit 40, а в FAQ на той же странице — Go up to 10 (kahoot.com/schools/plans); тарифы Kahoot+ поднимают лимит. Бесплатный лимит класса в LexiClash ясен: 50 учеников на класс.',
    beatsTitle: 'Когда LexiClash лучше Kahoot',
    beats: [
      { title: 'Словесные игры, а не викторины', desc: 'Для словарного запаса, правописания и языковой практики ученикам нужно находить, собирать и узнавать слова, а не выбирать между А/Б/В/Г. Это другая умственная нагрузка, и она лучше подходит для цели.' },
      { title: 'Игра бесплатно, Teacher Pro — для инструментов учителя', desc: 'Kahoot подталкивает вас к Kahoot+ ради расширенных отчётов, больших игр и некоторых режимов. Игра в классе в LexiClash остаётся бесплатной: 3 класса × 50 учеников, без регистрации учеников. Teacher Pro (9 $/мес.) — платное расширение для инструментов учителя: аналитика класса, отчёты для печати и настройка темпа и напряжения в спокойном режиме.' },
      { title: 'Один опубликованный бесплатный лимит', desc: 'В Kahoot! Go Free в таблице планов указано Participant limit 40, а в FAQ на той же странице — «Go up to 10» (kahoot.com/schools/plans). У бесплатного LexiClash чёткий лимит — 50 учеников на класс, и код входа совпадает со страницей планов.' },
      { title: 'Родные словари на нескольких языках', desc: 'Для изучения английского (ESL/EFL), уроков иврита и двуязычных классов испанского в LexiClash есть полные словари на 6 языках. Kahoot принимает любой текст, но игровых механик для работы с языком в нём нет.' },
      { title: 'Словарные дуэли 1 на 1', desc: 'Объединяйте учеников в пары для словесных поединков на 2–3 минуты. Формат Kahoot не позволяет заниматься в парах так же.' },
      { title: 'Быстрая подготовка', desc: 'На составление викторины в Kahoot уходит 2–5 минут. Списки слов в LexiClash загружаются меньше чем за минуту, а многие учителя берут встроенные списки и начинают играть сразу.' },
      { title: 'Класс без рекламы', desc: 'Бесплатный Kahoot время от времени показывает ученикам промо. Режим класса в LexiClash не содержит рекламы ни в одном тарифе.' },
    ],
    winsTitle: 'Когда Kahoot по-прежнему лучше',
    wins:
      'Kahoot создан для викторин, проверочных тестов и обучения вокруг презентации. Если цель — проверить знание исторических фактов, научных терминов в форме вопроса или повторить тему в конце раздела с выбором ответа, формат Kahoot создан именно для этого. LexiClash лучше подходит для правописания слов, распознавания языковых закономерностей, практики ESL/EFL и игр на составление слов. Многие учителя используют оба сервиса: Kahoot — для повторения фактов, LexiClash — для игр на словарный запас и правописание.',
    faqs: [
      { q: 'Является ли LexiClash бесплатной альтернативой Kahoot?', a: 'Да — LexiClash бесплатен для всего класса: 3 класса до 50 учеников, без платы за каждое место и без школьной лицензии. Teacher Pro (9 $/мес.) добавляет неограниченное число классов и отчёты для печати. Kahoot! Go Free оценить сложнее: в таблице планов для школ указано Participant limit 40, а в FAQ «What are the participant limits per game?» на той же странице — Go up to 10 (kahoot.com/schools/plans). Большинство возможностей уровня класса по-прежнему требует Kahoot+ за 4–15 $ в месяц на учителя.' },
      { q: 'Нужны ли ученикам аккаунты в LexiClash?', a: 'Нет. Ученики входят по коду из 6 символов (как по PIN-коду в Kahoot). Разница в том, что аккаунты учеников в LexiClash полностью необязательны, а Kahoot всё чаще подталкивает учеников входить в систему ради отслеживания прогресса.' },
      { q: 'LexiClash похож на Kahoot?', a: 'Это другая категория. Kahoot — платформа для викторин: ученики отвечают на вопросы с вариантами ответа под общий таймер, чаще всего на экране проектора. LexiClash — игра на составление слов: ученики ищут слова на сетках в стиле Boggle, в анаграммах или на колёсах слов. Для словарного запаса, правописания и языковой практики она подходит лучше, чем викторины с выбором ответа.' },
      { q: 'Можно ли использовать викторины Kahoot в LexiClash?', a: 'Нет — форматы разные. Но можно загрузить списки слов из любого источника (экспорт из Quizlet, CSV, ручной ввод) и использовать их в словесных играх LexiClash. Для викторин на эрудицию Kahoot остаётся подходящим инструментом; для практики слов и словарного запаса LexiClash создан специально.' },
      { q: 'Есть ли в LexiClash мультиплеер для всего класса?', a: 'Да — LexiClash поддерживает до 50 учеников в одной сессии класса, все играют в реальном времени, и класс такого размера играет бесплатно — один опубликованный бесплатный лимит. В Kahoot! Go Free в таблице планов указано Participant limit 40, а в FAQ на той же странице kahoot.com/schools/plans — «Go up to 10»; расширенные режимы и аналитика доступны только в Kahoot+.' },
      { q: 'Какой лимит участников у Kahoot! Go Free — по таблице или по FAQ?', a: 'На kahoot.com/schools/plans в столбце Go Free указано Participant limit 40, но FAQ «What are the participant limits per game?» на той же странице отвечает: «Go: Up to 10 participants per game.» LexiClash публикует один бесплатный лимит класса: 50 учеников на класс (3 класса) — страница планов и код входа совпадают.' },
      { q: 'А как насчёт классов английского и языковых занятий?', a: 'В LexiClash встроены словари английского, иврита (справа налево), испанского, шведского, японского и русского, поэтому игры на словарный запас работают на каждом языке как родные. Kahoot принимает любой язык в тексте вопросов, но не имеет механик словесных игр, связанных с языковыми словарями.' },
      { q: 'Сколько длится сессия в классе LexiClash?', a: 'Раунд для всего класса занимает 5–10 минут. Словарная дуэль 1 на 1 — 2–3 минуты. Большинство учителей используют это как пятиминутную разминку, передышку посреди урока или повторение в конце — те же случаи, что и у Kahoot, но с составлением слов вместо викторины.' },
    ],
    moreComparisons: [
      { title: 'LexiClash и Quizlet', desc: 'Словесные игры и карточки. Бесплатно и Quizlet Plus.' },
      { title: 'LexiClash и Wordle', desc: 'Игра без ограничений и одна загадка в день' },
      { title: 'Лучшие словесные игры 2026', desc: 'Полное руководство по сравнению' },
    ],
    tryTitle: 'Попробуйте до следующего урока',
    tryBody:
      'Тот же код входа и те же пять минут, к которым Kahoot приучил классы. Но словесные игры вместо викторин, бесплатно вместо Kahoot+ и подготовка за 60 секунд вместо 5 минут. Если это не подойдёт вашему классу, вы потеряете пять минут — и получите инструмент, о котором стоит помнить в дни повторения словарного запаса.',
    tryCta: 'Начать игру для класса бесплатно',
    breadcrumbPage: 'LexiClash и Kahoot',
  },
};

export const copies: Record<Locale, KahootPageCopy> = Object.fromEntries(
  (Object.keys(pageCopy) as Locale[]).map((l) => [l, { ...vsCommonCopy[l], ...pageCopy[l], cta2: vsCommonCopy[l].ctaTeachers, cta3: vsCommonCopy[l].ctaEsl }]),
) as Record<Locale, KahootPageCopy>;

export { resolveVsLocale } from '@/lib/seo/vsCommonCopy';
