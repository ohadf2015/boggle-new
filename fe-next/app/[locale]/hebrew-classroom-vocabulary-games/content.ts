// Native per-locale copy for the Hebrew classroom vocabulary games landing page.
// Hebrew copy is high-quality native content — preserved verbatim from original page.
// Other locales authored as native copy per ux-writer principles.

export type LocaleContent = {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  heroTag: string;
  heroPart1: string;
  heroHighlight1: string;
  heroPart2: string;
  heroHighlight2: string;
  heroSubtitle: string;
  ctaPrimary: { label: string; sub: string };
  ctaSecondary: { label: string; sub: string };
  featuresTitlePart: string;
  featuresTitleHighlight: string;
  features: Array<{ icon: string; text: string }>;
  useCasesTitlePart: string;
  useCasesTitleHighlight: string;
  useCases: Array<{ tag: string; title: string; desc: string }>;
  faqTitlePart: string;
  faqTitleHighlight: string;
  faqs: Array<{ q: string; a: string }>;
  ctaHeading1: string;
  ctaHeading2: string;
  ctaBody: string;
  ctaPrimaryBtn: string;
  ctaSecondaryBtn: string;
  compareText: string;
  compareLinkLabel: string;
};

export const CLASSROOM_GAME_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type ClassroomGameLocale = typeof CLASSROOM_GAME_LOCALES[number];

const contentMap: Record<ClassroomGameLocale, LocaleContent> = {
  en: {
    metaTitle: 'Free Word Games for Classrooms — Live Group Games, Vocabulary Duels, No Login | LexiClash',
    metaDescription:
      'Free word games built for classrooms. Students join with a 6-character code (no login, no accounts). Live classroom games, vocabulary duels, custom word lists, and real-time dashboards. Works in any browser. A whole class.',
    ogTitle: 'Classroom Word Games — Free, No Login, No Accounts',
    ogDescription:
      'Join with a code, play immediately. Live vocabulary games, spelling practice, no accounts needed. Works on any device.',
    twitterTitle: 'Free Classroom Word Games — LexiClash',
    twitterDescription: 'Live word games for classrooms. 6-character join code, no login, real vocabulary practice, a whole class.',
    heroTag: '★ FOR TEACHERS ★ FREE TO START ★',
    heroPart1: 'Word ',
    heroHighlight1: 'games',
    heroPart2: 'for class. ',
    heroHighlight2: 'Free.',
    heroSubtitle:
      'LexiClash is a word game platform for classrooms that builds vocabulary: live classroom games, head-to-head duels, your own word lists, and six languages — and students never open an account.',
    ctaPrimary: { label: '▶ Start a Classroom Game', sub: 'Free · No signup for students' },
    ctaSecondary: { label: '⚔ Run 1v1 Duels', sub: 'Students face off' },
    featuresTitlePart: 'What you ',
    featuresTitleHighlight: 'get',
    features: [
      { icon: '⚡', text: 'Students join in 5 seconds with a 6-character code — no login, no email' },
      { icon: '🎯', text: 'Three game modes: letter grid, word hunt, word wheel' },
      { icon: '👥', text: 'Live multiplayer — a whole class together' },
      { icon: '⚔️', text: 'Head-to-head vocabulary duels — for pair or small-group practice' },
      { icon: '📚', text: 'Upload your own word lists — from any unit, topic, or textbook' },
      { icon: '🌍', text: 'Six languages: English, Hebrew (right-to-left), Spanish, Swedish, Japanese, Russian' },
      { icon: '📊', text: 'Teacher dashboard: accuracy per student and which words most students missed' },
      { icon: '💸', text: 'Your whole class free — 3 classes of up to 50, no hidden charges' },
    ],
    useCasesTitlePart: 'How ',
    useCasesTitleHighlight: 'teachers',
    useCases: [
      { tag: 'Opener', title: 'Quick class opener', desc: 'Word wheel from yesterdays list — wakes the class in five minutes.' },
      { tag: 'Review', title: 'Unit wrap-up', desc: 'A round with the whole class on unit vocabulary; the dashboard instantly shows what to re-teach.' },
      { tag: '2nd Language', title: 'Target language practice', desc: 'Play in your students target language — six dictionaries built in: English, Hebrew, Spanish, Swedish, Japanese, Russian.' },
      { tag: 'No prep', title: 'Drop-in lesson', desc: 'Zero prep: pick a list, show the code, students play. Done in 10 minutes.' },
    ],
    faqTitlePart: 'Questions for ',
    faqTitleHighlight: 'teachers',
    faqs: [
      { q: 'What are the best word games for a classroom?', a: 'LexiClash is built for classrooms: students join with a 6-character code (no signup), the teacher picks a word list, and the whole class plays together live in 5–10 minutes. The game works in any browser and supports English, Hebrew, Spanish, Swedish, Japanese, and Russian — so it works for Hebrew classrooms, ESL classrooms, and foreign-language classrooms too.' },
      { q: 'Do students need to open an account?', a: 'No. Students type a 6-character code the teacher displays and start playing immediately. Only teachers open a free account — to save word lists and track class progress.' },
      { q: 'Can I upload my own vocabulary list?', a: 'Yes. Upload any word list — from a lesson, a chapter, or your curriculum — and play it as head-to-head duels, a whole-class round, or individual practice assigned to students.' },
      { q: 'How is it different from Quizlet, Kahoot, or Wordwall?', a: 'Quizlet, Kahoot, and Wordwall are based on flashcards and multiple-choice quizzes. LexiClash is a word-building game: students build words on a letter grid, word wheel, or anagram board. That means they practice spelling, retrieval, and pattern recognition — not just choosing from given answers. Plus: no student accounts, and it is all free.' },
      { q: 'How long does a classroom session take?', a: 'A vocabulary duel runs 2–3 minutes. A whole-class round runs 5–10 minutes. Most teachers run it as a five-minute class opener, a mid-lesson brain break, or a quick review before the bell.' },
      { q: 'Does it work for elementary, middle, and high school?', a: 'All three. Difficulty level, time limit, and word list are set per session. Younger students play with short words and easy lists; high school students run advanced vocabulary duels under time pressure.' },
      { q: 'Does it work for Hebrew as a second language classrooms?', a: 'Yes. Six built-in dictionaries (Hebrew, English, Spanish, Swedish, Japanese, Russian) make LexiClash ideal for Hebrew-language classrooms, ESL, and immigrant-student catch-up programs. Students practice spelling and retrieval directly in the target language.' },
      { q: 'Can I track which words each student masters?', a: 'Yes. The teacher dashboard shows accuracy per student, which words were missed most, and which words tripped up the most students in the class — a strong foundation for formative assessment and your next review plan.' },
    ],
    ctaHeading1: 'Ten minutes left in class?',
    ctaHeading2: 'Run a vocabulary game.',
    ctaBody: 'Pick a list. Display the code. Play. Look at the dashboard. Done — the whole cycle.',
    ctaPrimaryBtn: '▶ Start a Classroom Game',
    ctaSecondaryBtn: 'Visit the Education Hub',
    compareText: 'Torn between tools? ',
    compareLinkLabel: 'Honest comparison: LexiClash vs. Wordwall, Kahoot, and Quizlet ←',
  },
  he: {
    metaTitle: 'משחקי מילים לכיתה בעברית — אוצר מילים חינם למורים | LexiClash',
    metaDescription:
      'משחקי מילים לכיתה בעברית — חינם וללא הרשמה לתלמידים. דו-קרבות אוצר מילים ומשחק כיתתי חי: מצרפים את הכיתה בקוד, בוחרים רשימת מילים ומשחקים. עובד בכל דפדפן.',
    ogTitle: 'משחקי מילים לכיתה — חינם, ללא הרשמה לתלמידים | LexiClash',
    ogDescription: 'משחקי אוצר מילים לכיתה בעברית. דו-קרבות 1v1, משחק כיתתי חי, בלי הרשמה לתלמידים.',
    twitterTitle: 'משחקי מילים לכיתה - LexiClash',
    twitterDescription: 'חינם, בלי הרשמה, עובד בדפדפן. דו-קרבות אוצר מילים + משחק כיתתי חי.',
    heroTag: '★ למורים ★ חינם להתחלה ★',
    heroPart1: 'משחקי ',
    heroHighlight1: 'מילים',
    heroPart2: 'לכיתה. ',
    heroHighlight2: 'חינם.',
    heroSubtitle:
      'LexiClash היא פלטפורמת משחקי מילים לכיתה להעשרת אוצר מילים: משחק כיתתי חי, דו-קרבות אחד-על-אחד, רשימות המילים שלכם ושש שפות — והתלמידים אף פעם לא פותחים חשבון.',
    ctaPrimary: { label: '▶ התחילו משחק כיתתי', sub: 'חינם · ללא הרשמה לתלמידים' },
    ctaSecondary: { label: '⚔ הריצו דו-קרב 1v1', sub: 'תלמידים פנים מול פנים' },
    featuresTitlePart: 'מה ',
    featuresTitleHighlight: 'מקבלים',
    features: [
      { icon: '⚡', text: 'התלמידים מצטרפים תוך 5 שניות עם קוד בן 6 תווים — בלי התחברות ובלי אימייל' },
      { icon: '🎯', text: 'שלושה מצבי משחק: לוח אותיות, ציד מילים וגלגל מילים' },
      { icon: '👥', text: 'משחק רב-משתתפים חי — כל הכיתה יחד' },
      { icon: '⚔️', text: 'דו-קרבות אוצר מילים אחד-על-אחד — לתרגול בזוגות או בקבוצות קטנות' },
      { icon: '📚', text: 'מעלים את רשימות המילים שלכם — מכל יחידה, מכל נושא, מכל ספר לימוד' },
      { icon: '🌍', text: 'שש שפות: אנגלית, עברית (מימין לשמאל), ספרדית, שוודית, יפנית ורוסית' },
      { icon: '📊', text: 'לוח בקרה למורה: דיוק לכל תלמיד והמילים שהכי הרבה תלמידים פספסו' },
      { icon: '💸', text: 'כל הכיתה בחינם — 3 כיתות של עד 50 תלמידים, בלי תשלום נסתר' },
    ],
    useCasesTitlePart: 'איך ',
    useCasesTitleHighlight: 'מורים',
    useCases: [
      { tag: 'פתיחה', title: 'פעילות פתיחה לשיעור', desc: 'גלגל מילים מהיום אתמול — מעיר את הכיתה תוך חמש דקות.' },
      { tag: 'חזרה', title: 'סיכום סוף יחידה', desc: 'סיבוב לכל הכיתה על מילות המפתח של היחידה; הלוח חושף מיד על מה כדאי לחזור.' },
      { tag: 'שפה שנייה', title: 'תרגול בשפת היעד', desc: 'משחקים בשפת היעד של התלמידים — שש מילונים: עברית, אנגלית, ספרדית, שוודית, יפנית ורוסית.' },
      { tag: 'ממלא מקום', title: 'שיעור בלי הכנה', desc: 'אפס הכנה מראש: בוחרים רשימה, מקרינים קוד, התלמידים משחקים. נגמר תוך 10 דקות.' },
    ],
    faqTitlePart: 'שאלות ',
    faqTitleHighlight: 'למורים',
    faqs: [
      { q: 'מה הם משחקי המילים הטובים ביותר לכיתה בעברית?', a: 'LexiClash Education נבנה במיוחד לכיתות בעברית: התלמידים מצטרפים בקוד בן 6 תווים (בלי הרשמה), המורה בוחר רשימת מילים, וכל הכיתה משחקת יחד בזמן אמת 5–10 דקות. המשחק עובד בכל דפדפן ותומך בעברית, אנגלית, ספרדית, שוודית, יפנית ורוסית — ולכן מתאים גם לכיתות עברית כשפה שנייה ולשיעורי שפה.' },
      { q: 'האם התלמידים צריכים לפתוח חשבון?', a: 'לא. התלמידים מקלידים קוד בן 6 תווים שהמורה מציג על המסך ומתחילים לשחק מיד. רק המורים פותחים חשבון — בחינם — כדי לשמור רשימות מילים ולעקוב אחרי ההתקדמות של הכיתה.' },
      { q: 'אפשר לייבא רשימת אוצר מילים משלי?', a: 'כן. אפשר להעלות כל רשימת מילים — מיחידת לימוד, מספר לימוד או מתכנית הלימודים — ולשחק איתה בדו-קרבות אחד-על-אחד, במשחק לכל הכיתה או בתרגול אישי שמוקצה לתלמידים.' },
      { q: 'במה זה שונה מ-Quizlet, Kahoot או Wordwall?', a: 'Quizlet, Kahoot ו-Wordwall בנויים על כרטיסיות ועל חידוני רב-ברירה. LexiClash הוא משחק בניית מילים: התלמידים מרכיבים מילים על לוח אותיות, גלגל אותיות או אנגרמה. כך מתאמנים על איות, שליפה וזיהוי דפוסים — לא רק בחירה מתוך תשובות מוכנות. ובנוסף: בלי חשבונות לתלמידים, והכול חינם.' },
      { q: 'כמה זמן אורך מפגש כיתתי?', a: 'דו-קרב אוצר מילים אורך 2–3 דקות. סיבוב לכל הכיתה אורך 5–10 דקות. רוב המורים מריצים את זה כפעילות פתיחה של חמש דקות, כאתנחתא באמצע השיעור או כחזרה לקראת סוף השיעור.' },
      { q: 'זה מתאים ליסודי, לחטיבה ולתיכון?', a: 'לכל השלוש. רמת הקושי, מגבלת הזמן ורשימת המילים נקבעות לכל מפגש בנפרד. תלמידים צעירים משחקים עם מילים קצרות ורשימות קלות; תלמידי תיכון מנהלים דו-קרבות אוצר מילים מתקדמים בזמן קצוב.' },
      { q: 'זה עובד לכיתות עברית כשפה שנייה?', a: 'כן. שש מילונים מובנים בתוך המשחק (עברית, אנגלית, ספרדית, שוודית, יפנית ורוסית) הופכים את LexiClash למתאים לעברית כשפה שנייה, לאנגלית כשפה זרה (ESL) ולכיתות קליטת עולים. התלמידים מתרגלים איות ושליפה ישירות בשפת היעד.' },
      { q: 'אפשר לעקוב אחרי המילים שכל תלמיד שולט בהן?', a: 'כן. לוח הבקרה למורה מציג דיוק לכל תלמיד, אילו מילים פוספסו, ואילו מילים הכשילו הכי הרבה תלמידים בכיתה — בסיס מצוין להערכה מעצבת ולתכנון החזרה הבאה.' },
    ],
    ctaHeading1: 'עשר דקות נשארו בשיעור?',
    ctaHeading2: 'הריצו משחק אוצר מילים.',
    ctaBody: 'בוחרים רשימה. מציגים קוד. משחקים. מסתכלים על הלוח. וזהו — כל המחזור.',
    ctaPrimaryBtn: '▶ התחילו משחק כיתתי',
    ctaSecondaryBtn: 'ראו את מרכז החינוך',
    compareText: 'מתלבטים בין הכלים? ',
    compareLinkLabel: 'השוואה כנה: LexiClash מול Wordwall, Kahoot ו-Quizlet ←',
  },
  sv: {
    metaTitle: 'Gratis ordspel för klassrummet — Livegrupper, orddueller, ingen inloggning | LexiClash',
    metaDescription:
      'Gratis ordspel designade för klassrummet. Eleverna går med med en fyrsiffrig kod (ingen inloggning, inga konton). Live klassrumsspel, orddueller, egna ordlistor och realtidstavlor. Funkar i vilken webbläsare som helst. Hela klassen.',
    ogTitle: 'Ordspel för klassrummet — gratis, ingen inloggning',
    ogDescription: 'Gå med med en kod och spela direkt. Liveordspel, stavningsöving, inga konton behövs. Fungerar på vilken enhet som helst.',
    twitterTitle: 'Gratis ordspel för klassrummet — LexiClash',
    twitterDescription: 'Liveordspel för klassrummet. Fyrsiffrig kod för att gå med, ingen inloggning, riktig ordöving, hela klassen.',
    heroTag: '★ FÖR LÄRARE ★ GRATIS ATT BÖRJA ★',
    heroPart1: 'Ordspel ',
    heroHighlight1: 'för klassrummet',
    heroPart2: '. ',
    heroHighlight2: 'Gratis.',
    heroSubtitle:
      'LexiClash är en ordspelsplattform för klassrummet som bygger ordförråd: livegrupper, en-mot-en-dueller, dina egna ordlistor, och sex språk — och eleverna behöver aldrig öppna ett konto.',
    ctaPrimary: { label: '▶ Starta ett klassrumsspel', sub: 'Gratis · ingen registrering för elever' },
    ctaSecondary: { label: '⚔ Kör 1v1-dueller', sub: 'Elever möts ansikte mot ansikte' },
    featuresTitlePart: 'Vad du ',
    featuresTitleHighlight: 'får',
    features: [
      { icon: '⚡', text: 'Elever går med på 5 sekunder med en fyrsiffrig kod — ingen inloggning, inget e-postadress' },
      { icon: '🎯', text: 'Tre spellägen: bokstavsnät, ordletare, ordhjul' },
      { icon: '👥', text: 'Direkt flerspelat — hela klassen tillsammans' },
      { icon: '⚔️', text: 'Orddueller ansikte mot ansikte — för par- eller smågruppöving' },
      { icon: '📚', text: 'Ladda upp dina egna ordlistor — från vilken enhet, vilket ämne eller lärobok som helst' },
      { icon: '🌍', text: 'Sex språk: engelska, hebreiska (höger till vänster), spanska, svenska, japanska, ryska' },
      { icon: '📊', text: 'Lärardashboard: träffsäkerhet per elev och vilka ord som missades mest' },
      { icon: '💸', text: 'Allt är gratis — ingen premiumversion, inga dolda avgifter' },
    ],
    useCasesTitlePart: 'Hur ',
    useCasesTitleHighlight: 'lärare',
    useCases: [
      { tag: 'Öppning', title: 'Snabb klassöppning', desc: 'Ordhjul från gårdagens lista — väcker klassen på fem minuter.' },
      { tag: 'Repetition', title: 'Enhetssammanfattning', desc: 'En rond med hela klassen på enhetens ordförråd; dashboarden visar genast vad som behöver upprepas.' },
      { tag: 'Andrespråk', title: 'Målspråksöving', desc: 'Spela på dina elevers målspråk — sex inbyggda ordböcker: engelska, hebreiska, spanska, svenska, japanska, ryska, ryska.' },
      { tag: 'Ingen förberedelse', title: 'Lektionsdropp', desc: 'Noll förberedelse: välj en lista, visa koden, eleverna spelar. Klart på 10 minuter.' },
    ],
    faqTitlePart: 'Frågor för ',
    faqTitleHighlight: 'lärare',
    faqs: [
      { q: 'Vilka är de bästa ordspelen för ett klassrum?', a: 'LexiClash är byggt för klassrummet: eleverna går med en fyrsiffrig kod (ingen registrering), läraren väljer en ordlista och hela klassen spelar tillsammans live på 5–10 minuter. Spelet fungerar i vilken webbläsare som helst och stöder engelska, hebreiska, spanska, svenska, japanska, ryska och ryska — så det fungerar för hebreiska klassrum, ESL-klassrum och språkklassrum också.' },
      { q: 'Behöver elever öppna ett konto?', a: 'Nej. Eleverna skriver en fyrsiffrig kod som läraren visar och börjar spela omedelbar. Endast lärare öppnar ett gratis konto — för att spara ordlistor och följa klassens framsteg.' },
      { q: 'Kan jag ladda upp min egen ordlista?', a: 'Ja. Ladda upp vilken ordlista som helst — från en lektion, ett kapitel eller din läroplan — och spela den som en-mot-en-dueller, en helklassrond eller individuell träning tilldelad elever.' },
      { q: 'Hur skiljer det sig från Quizlet, Kahoot eller Wordwall?', a: 'Quizlet, Kahoot och Wordwall är baserade på flashcards och flervalsfrågor. LexiClash är ett ordbyggespel: eleverna bygger ord på ett bokstavsnät, ordhjul eller anagrambord. Det innebär att de tränar stavning, retrieval och mönsterigenkänning — inte bara att välja från givna svar. Plus: inga elevkonton, och det är helt gratis.' },
      { q: 'Hur lång tid tar en klassrumssession?', a: 'En ordduell tar 2–3 minuter. En helklassrond tar 5–10 minuter. De flesta lärare kör det som en fem minuters klassöppning, ett mentalt vilo under lektionen eller en snabb repetition före klockan.' },
      { q: 'Fungerar det för lågstadiet, mellanstadiet och gymnasiet?', a: 'Alla tre. Svårighetsgrad, tidsgräns och ordlista ställs in per session. Yngre elever spelar med korta ord och lätta listor; gymnasieelever kör avancerade orddueller under tidsbegränsning.' },
      { q: 'Fungerar det för klassrum med hebreiska som andrespråk?', a: 'Ja. Sex inbyggda ordböcker (hebreiska, engelska, spanska, svenska, japanska, ryska) gör LexiClash idealisk för hebreciska språkklassrum, ESL och invandrarelevprogram. Eleverna tränar stavning och retrieval direkt på målspråket.' },
      { q: 'Kan jag spåra vilka ord varje elev behärskar?', a: 'Ja. Lärardashboarden visar träffsäkerhet per elev, vilka ord som missades mest och vilka ord som föll till flest elever i klassen — en stark grund för formativ bedömning och din nästa repetitionsplan.' },
    ],
    ctaHeading1: 'Tio minuter kvar i lektionen?',
    ctaHeading2: 'Kör ett ordspel.',
    ctaBody: 'Välj en lista. Visa koden. Spela. Titta på instrumentpanelen. Klart — hel cykeln.',
    ctaPrimaryBtn: '▶ Starta ett klassrumsspel',
    ctaSecondaryBtn: 'Besök utbildningsnavet',
    compareText: 'Osäker på vilket verktyg? ',
    compareLinkLabel: 'Ärlig jämförelse: LexiClash vs. Wordwall, Kahoot och Quizlet ←',
  },
  ja: {
    metaTitle: '教室向け無料単語ゲーム — ライブグループゲーム・単語デュエル・ログイン不要 | LexiClash',
    metaDescription:
      '教室向けに設計された無料単語ゲーム。生徒は6文字のコードで参加（ログイン不要、アカウント不要）。ライブ教室ゲーム、単語デュエル、カスタム単語リスト、リアルタイムダッシュボード。どのブラウザでも動作。クラス全員。',
    ogTitle: '教室向け単語ゲーム — 無料・ログイン不要',
    ogDescription: 'コードで参加してすぐに遊べます。ライブ単語ゲーム、スペル練習、アカウント不要。どの端末でも動作します。',
    twitterTitle: '無料の教室向け単語ゲーム — LexiClash',
    twitterDescription: '教室向けライブ単語ゲーム。6文字のコードで参加、ログイン不要、ほんもののボキャブラリー練習、クラス全員。',
    heroTag: '★ 先生向け ★ 無料で開始 ★',
    heroPart1: '単語 ',
    heroHighlight1: 'ゲーム',
    heroPart2: 'は教室向け。 ',
    heroHighlight2: '無料。',
    heroSubtitle:
      'LexiClashは教室向けの単語ゲームプラットフォーム。ボキャブラリー力を高める：ライブグループゲーム、1対1デュエル、自分の単語リスト、6言語——生徒はアカウントを開く必要がありません。',
    ctaPrimary: { label: '▶ 教室ゲームを始める', sub: '無料 · 生徒の登録不要' },
    ctaSecondary: { label: '⚔ 1対1デュエルを実行', sub: '生徒が対戦' },
    featuresTitlePart: 'あなたが ',
    featuresTitleHighlight: '得られるもの',
    features: [
      { icon: '⚡', text: '生徒は6文字のコードで5秒で参加 — ログインなし、メールなし' },
      { icon: '🎯', text: '3つのゲームモード：文字グリッド、単語ハント、単語ホイール' },
      { icon: '👥', text: 'リアルタイムマルチプレイヤー — クラス全員が一緒に' },
      { icon: '⚔️', text: '1対1の単語デュエル — ペアと小グループ練習用' },
      { icon: '📚', text: '自分の単語リストをアップロード — どの単元・テーマ・教材からでも' },
      { icon: '🌍', text: '6言語：英語、ヘブライ語（右から左）、スペイン語、スウェーデン語、日本語、ロシア語' },
      { icon: '📊', text: '先生用ダッシュボード：生徒ごとの正確さと、クラスで最も間違えた単語' },
      { icon: '💸', text: 'クラス全員が無料 — 3クラス・各50人、隠れた料金なし' },
    ],
    useCasesTitlePart: '先生が ',
    useCasesTitleHighlight: 'どう使うか',
    useCases: [
      { tag: 'オープニング', title: '授業の素早い導入', desc: '昨日のリストから単語ホイール — 5分でクラスを目覚めさせます。' },
      { tag: 'リビュー', title: '単元のまとめ', desc: '単元のキーワードで全クラスラウンド；ダッシュボードで何を復習すべきか即座に分かります。' },
      { tag: '第二言語', title: '目標言語の練習', desc: '生徒の目標言語でプレイ — 6言語の組み込み辞書：英語、ヘブライ語、スペイン語、スウェーデン語、日本語、ロシア語。' },
      { tag: '準備不要', title: 'ドロップイン授業', desc: 'ゼロ準備：リストを選んで、コードを表示して、生徒が遊びます。10分で完了。' },
    ],
    faqTitlePart: '先生向け ',
    faqTitleHighlight: 'よくある質問',
    faqs: [
      { q: '教室に最適な単語ゲームは？', a: 'LexiClashは教室向けに構築：生徒が6文字のコードで参加（登録なし）し、先生が単語リストを選んで、クラス全体が5～10分でライブプレイします。ゲームはどのブラウザでも動作し、英語、ヘブライ語、スペイン語、スウェーデン語、日本語、ロシア語をサポート——ヘブライ語クラス、ESLクラス、外国語クラスにも対応。' },
      { q: '生徒はアカウントを開く必要がありますか？', a: 'いいえ。生徒は先生が表示した6文字のコードを入力してすぐに遊び始めます。先生だけが無料アカウントを開きます——単語リストを保存し、クラスの進歩を追跡するため。' },
      { q: '自分の単語リストをアップロードできますか？', a: 'はい。任意の単語リストをアップロード——レッスン・章・カリキュラムから——1対1デュエル・全クラスラウンド・生徒に割り当てられた個別練習としてプレイできます。' },
      { q: 'Quizlet、Kahoot、Wordwallとの違いは？', a: 'Quizlet、Kahoot、Wordwallはフラッシュカードと多肢選択クイズベース。LexiClashは単語構築ゲーム：生徒が文字グリッド・単語ホイール・アナグラムボードで単語を構築します。つまりスペル・リトリーバル・パターン認識を練習——与えられた選択肢から選ぶだけではない。さらに：生徒アカウントなし、完全無料。' },
      { q: '教室セッションはどのくらい長いですか？', a: '1つの単語デュエルは2～3分。全クラスラウンドは5～10分。ほとんどの先生は5分のクラスオープナー・授業中の頭のリセット・終了前の素早い復習として実行。' },
      { q: '小学校・中学校・高校に対応？', a: 'すべてに対応。難易度・時間制限・単語リストはセッションごとに設定。年下の生徒は短い単語と簡単なリスト；高校生は時間制限下で高度な単語デュエルを実行。' },
      { q: 'ヘブライ語を第二言語とするクラスに対応？', a: 'はい。6言語の組み込み辞書（ヘブライ語・英語・スペイン語・スウェーデン語・日本語・ロシア語）でLexiClashはヘブライ語言語クラス・ESL・移民学生プログラムに理想的。生徒は目標言語で直接スペルとリトリーバルを練習。' },
      { q: '各生徒がマスターした単語を追跡できますか？', a: 'はい。先生用ダッシュボードは生徒ごとの正確さ・最も間違えた単語・クラスで最もつまずいた単語を表示——形成的評価と次の復習計画の強固な基礎。' },
    ],
    ctaHeading1: '授業あと10分？',
    ctaHeading2: '単語ゲームを実行。',
    ctaBody: 'リストを選んで。コードを表示して。遊んで。ダッシュボード見て。完了 — サイクル全体。',
    ctaPrimaryBtn: '▶ 教室ゲームを始める',
    ctaSecondaryBtn: '教育ハブを訪問',
    compareText: 'ツールで迷ってますか？ ',
    compareLinkLabel: '率直な比較：LexiClash vs. Wordwall、Kahoot、Quizlet ←',
  },
  es: {
    metaTitle: 'Juegos de palabras gratis para aulas — Juegos en vivo, duelos de vocabulario, sin registro | LexiClash',
    metaDescription:
      'Juegos de palabras gratis diseñados para el aula. Los alumnos se unen con un código de 6 caracteres (sin registro, sin cuentas). Juegos de aula en vivo, duelos de vocabulario, listas de palabras personalizadas y tableros en tiempo real. Funciona en cualquier navegador. Toda la clase.',
    ogTitle: 'Juegos de palabras para aula — gratis, sin registro',
    ogDescription: 'Únete con un código y juega al instante. Juegos en vivo, práctica de ortografía, sin cuentas necesarias. Funciona en cualquier dispositivo.',
    twitterTitle: 'Juegos de palabras gratis para aula — LexiClash',
    twitterDescription: 'Juegos en vivo para aula. Código de 6 caracteres para unirse, sin registro, práctica real de vocabulario, toda la clase.',
    heroTag: '★ PARA MAESTROS ★ GRATIS PARA EMPEZAR ★',
    heroPart1: 'Juegos de ',
    heroHighlight1: 'palabras',
    heroPart2: 'para clase. ',
    heroHighlight2: 'Gratis.',
    heroSubtitle:
      'LexiClash es una plataforma de juegos de palabras para aula que desarrolla vocabulario: juegos grupales en vivo, duelos uno a uno, tus propias listas de palabras, y seis idiomas — y los alumnos nunca abren una cuenta.',
    ctaPrimary: { label: '▶ Comienza un juego de aula', sub: 'Gratis · Sin registro para alumnos' },
    ctaSecondary: { label: '⚔ Ejecuta duelos 1v1', sub: 'Los alumnos se enfrentan' },
    featuresTitlePart: 'Lo que ',
    featuresTitleHighlight: 'obtienes',
    features: [
      { icon: '⚡', text: 'Los alumnos se unen en 5 segundos con un código de 6 caracteres — sin registro, sin correo' },
      { icon: '🎯', text: 'Tres modos de juego: cuadrícula de letras, búsqueda de palabras, rueda de palabras' },
      { icon: '👥', text: 'Multijugador en vivo — toda la clase a la vez' },
      { icon: '⚔️', text: 'Duelos de vocabulario cara a cara — para práctica en parejas o pequeños grupos' },
      { icon: '📚', text: 'Sube tus propias listas de palabras — de cualquier unidad, tema o libro de texto' },
      { icon: '🌍', text: 'Seis idiomas: inglés, hebreo (de derecha a izquierda), español, sueco, japonés y ruso' },
      { icon: '📊', text: 'Panel del maestro: precisión por alumno y las palabras que más alumnos perdieron' },
      { icon: '💸', text: 'Toda tu clase gratis — 3 clases de hasta 50 alumnos, sin cargos ocultos' },
    ],
    useCasesTitlePart: 'Cómo los ',
    useCasesTitleHighlight: 'maestros',
    useCases: [
      { tag: 'Inicio', title: 'Inicio rápido de clase', desc: 'Rueda de palabras de la lista de ayer — despierta la clase en cinco minutos.' },
      { tag: 'Repaso', title: 'Cierre de unidad', desc: 'Una ronda con toda la clase sobre el vocabulario de la unidad; el panel muestra al instante qué repasar.' },
      { tag: '2º idioma', title: 'Práctica en idioma objetivo', desc: 'Juega en el idioma objetivo de tus alumnos — seis diccionarios incorporados: inglés, hebreo, español, sueco, japonés y ruso.' },
      { tag: 'Sin prep', title: 'Clase improvisada', desc: 'Cero preparación: elige una lista, muestra el código, los alumnos juegan. Listo en 10 minutos.' },
    ],
    faqTitlePart: 'Preguntas de ',
    faqTitleHighlight: 'maestros',
    faqs: [
      { q: '¿Cuáles son los mejores juegos de palabras para un aula?', a: 'LexiClash está diseñado para aulas: los alumnos se unen con un código de 6 caracteres (sin registro), el maestro elige una lista de palabras, y toda la clase juega en vivo en 5–10 minutos. El juego funciona en cualquier navegador y admite inglés, hebreo, español, sueco, japonés y ruso — así que también funciona para aulas de hebreo, aulas de ESL y aulas de idiomas extranjeros.' },
      { q: '¿Necesitan los alumnos abrir una cuenta?', a: 'No. Los alumnos escriben un código de 6 caracteres que el maestro muestra y comienzan a jugar inmediatamente. Solo los maestros abren una cuenta gratis — para guardar listas de palabras y seguir el progreso de la clase.' },
      { q: '¿Puedo subir mi propia lista de vocabulario?', a: 'Sí. Sube cualquier lista de palabras — de una lección, un capítulo o tu plan de estudios — y juega como duelos uno a uno, una ronda de toda la clase, o práctica individual asignada a alumnos.' },
      { q: '¿Cómo se diferencia de Quizlet, Kahoot o Wordwall?', a: 'Quizlet, Kahoot y Wordwall se basan en tarjetas didácticas y cuestionarios de opción múltiple. LexiClash es un juego de construcción de palabras: los alumnos construyen palabras en una cuadrícula de letras, rueda de palabras o tablero de anagramas. Eso significa que practican ortografía, recuperación y reconocimiento de patrones — no solo elegir entre respuestas dadas. Además: sin cuentas de alumnos, y es completamente gratis.' },
      { q: '¿Cuánto dura una sesión de aula?', a: 'Un duelo de vocabulario toma 2–3 minutos. Una ronda de toda la clase toma 5–10 minutos. La mayoría de los maestros lo ejecutan como un inicio de clase de cinco minutos, un descanso mental a mitad de la lección o una rápida revisión antes de la campana.' },
      { q: '¿Funciona para primaria, secundaria y bachillerato?', a: 'Los tres. El nivel de dificultad, límite de tiempo y lista de palabras se configuran por sesión. Los alumnos más jóvenes juegan con palabras cortas y listas fáciles; los alumnos de bachillerato ejecutan duelos avanzados bajo presión de tiempo.' },
      { q: '¿Funciona para aulas de hebreo como segundo idioma?', a: 'Sí. Seis diccionarios incorporados (hebreo, inglés, español, sueco, japonés y ruso) hacen que LexiClash sea ideal para aulas de idioma hebreo, ESL y programas de catch-up para estudiantes inmigrantes. Los alumnos practican la ortografía y la recuperación directamente en el idioma objetivo.' },
      { q: '¿Puedo rastrear qué palabras domina cada alumno?', a: 'Sí. El panel del maestro muestra precisión por alumno, qué palabras se perdieron más y qué palabras tropezaron la mayoría de los alumnos en la clase — una base sólida para evaluación formativa y tu próximo plan de repaso.' },
    ],
    ctaHeading1: '¿Diez minutos al final de clase?',
    ctaHeading2: 'Ejecuta un juego de palabras.',
    ctaBody: 'Elige una lista. Muestra el código. Juega. Mira el panel. Listo — todo el ciclo.',
    ctaPrimaryBtn: '▶ Comienza un juego de aula',
    ctaSecondaryBtn: 'Visita el centro educativo',
    compareText: '¿Indeciso entre herramientas? ',
    compareLinkLabel: 'Comparación honesta: LexiClash vs. Wordwall, Kahoot y Quizlet ←',
  },
  ru: {
    metaTitle: 'Бесплатные словесные игры для класса — живые игры, словарные дуэли, без входа | LexiClash',
    metaDescription:
      'Бесплатные словесные игры для урока. Ученики присоединяются по коду из 6 символов (без входа, без аккаунтов). Живые классные игры, дуэли по словарю, свои списки слов, панели в реальном времени. Работает в браузере. Весь класс.',
    ogTitle: 'Словесные игры для класса — бесплатно, без входа',
    ogDescription: 'Введи код и играй. Живые игры, практика орфографии, аккаунты не нужны. Работает на любом устройстве.',
    twitterTitle: 'Бесплатные словесные игры для урока — LexiClash',
    twitterDescription: 'Живые игры по словам. код из 6 символов, без входа, реальная практика лексики, весь класс.',
    heroTag: '★ ДЛЯ УЧИТЕЛЕЙ ★ БЕСПЛАТНО НАЧАТЬ ★',
    heroPart1: 'Словесные ',
    heroHighlight1: 'игры',
    heroPart2: 'на уроке. ',
    heroHighlight2: 'Бесплатно.',
    heroSubtitle:
      'LexiClash — платформа словесных игр для урока, которая развивает словарный запас: живые групповые игры, дуэли один на один, ваши собственные списки слов и шесть языков — и ученики никогда не создают аккаунт.',
    ctaPrimary: { label: '▶ Начать игру в классе', sub: 'Бесплатно · без входа для учеников' },
    ctaSecondary: { label: '⚔ Запустить дуэли 1v1', sub: 'Ученики играют друг против друга' },
    featuresTitlePart: 'Что вы ',
    featuresTitleHighlight: 'получаете',
    features: [
      { icon: '⚡', text: 'Ученики присоединяются за 5 секунд — вводят код из 6 символов, без входа и почты' },
      { icon: '🎯', text: 'Три режима игры: буквенная сетка, охота за словами, колесо слов' },
      { icon: '👥', text: 'Живой мультиплеер — весь класс одновременно' },
      { icon: '⚔️', text: 'Лексические дуэли один на один — для работы в парах и малых группах' },
      { icon: '📚', text: 'Загрузите свои списки слов — из любого раздела, темы или учебника' },
      { icon: '🌍', text: 'Шесть языков: английский, иврит (справа налево), испанский, шведский, японский, русский' },
      { icon: '📊', text: 'Панель учителя: точность каждого ученика и слова, которые чаще всего не получаются' },
      { icon: '💸', text: 'Полностью бесплатно — нет премиум-тарифа, нет скрытых платежей' },
    ],
    useCasesTitlePart: 'Как это ',
    useCasesTitleHighlight: 'используют',
    useCases: [
      { tag: 'Вводная', title: 'Быстрое начало урока', desc: 'Колесо слов из вчерашнего списка — разбудит класс за пять минут.' },
      { tag: 'Повторение', title: 'Закрепление раздела', desc: 'Раунд со всем классом по словарю раздела; панель сразу показывает, что повторить.' },
      { tag: 'Второй язык', title: 'Практика на целевом языке', desc: 'Играйте на языке ваших учеников — шесть встроенных словарей: английский, иврит, испанский, шведский, японский и русский.' },
      { tag: 'Без подготовки', title: 'Внезапный урок', desc: 'Никакой подготовки: выбрал список, показал код, ученики играют. За 10 минут готово.' },
    ],
    faqTitlePart: 'Вопросы ',
    faqTitleHighlight: 'учителей',
    faqs: [
      { q: 'Какие самые лучшие словесные игры для класса?', a: 'LexiClash специально для класса: ученики присоединяются по коду из 6 символов (без входа), учитель выбирает список слов, весь класс играет живьём 5–10 минут. Работает в любом браузере, поддерживает английский, иврит, испанский, шведский, японский и русский — подходит для классов иврита, ESL и иностранных языков.' },
      { q: 'Ученикам нужны аккаунты?', a: 'Нет. Ученики вводят код из 6 символов, который показывает учитель, и сразу играют. Аккаунт открывает только учитель — бесплатно, чтобы сохранять списки и следить за прогрессом класса.' },
      { q: 'Смогу ли я загрузить свой список слов?', a: 'Да. Загрузите любой список — из урока, главы или программы — и играйте дуэли один на один, раунд со всем классом или назначьте персональную практику ученикам.' },
      { q: 'Чем это лучше Quizlet, Kahoot или Wordwall?', a: 'Quizlet, Kahoot и Wordwall — это карточки и викторины с выбором ответа. LexiClash — игра на построение слов: ученики составляют слова на сетке букв, колесе или анаграмме. Они практикуют орфографию, вспоминание и узнавание паттернов — не просто выбор из готовых вариантов. Плюс: без аккаунтов учеников, полностью бесплатно.' },
      { q: 'Сколько времени занимает игровой сеанс?', a: 'Один лексический дуэль — 2–3 минуты. Раунд со всем классом — 5–10 минут. Большинство учителей запускают как 5-минутное начало урока, перерыв посередине или быструю проверку перед звонком.' },
      { q: 'Подходит ли для начальной, средней и старшей школы?', a: 'Да. Сложность, время и список слов настраиваются для каждого сеанса. Младшие ученики играют с короткими словами и лёгкими списками; старшеклассники берут сложные дуэли под давлением времени.' },
      { q: 'Работает ли для классов иврита как иностранного?', a: 'Да. Шесть встроенных словарей (иврит, английский, испанский, шведский, японский, русский) делают LexiClash идеален для иврита, ESL и программ интеграции иммигрантов. Ученики отрабатывают орфографию и вспоминание прямо на целевом языке.' },
      { q: 'Смогу ли отследить, какие слова освоил каждый ученик?', a: 'Да. Панель учителя показывает точность каждого, какие слова не получаются и какие дались труднее всего классу — хорошая основа для оценки и следующего повтора.' },
    ],
    ctaHeading1: 'До конца урока осталось десять минут?',
    ctaHeading2: 'Запустите словесную игру.',
    ctaBody: 'Выбрал список. Показал код. Играют. Смотришь панель. Всё — один цикл.',
    ctaPrimaryBtn: '▶ Начать игру в классе',
    ctaSecondaryBtn: 'Центр образования',
    compareText: 'Сомневаетесь в выборе? ',
    compareLinkLabel: 'Честное сравнение: LexiClash vs. Wordwall, Kahoot и Quizlet ←',
  },
};

export function getHebrewClassroomContent(locale: string): LocaleContent {
  return contentMap[(locale as ClassroomGameLocale)] ?? contentMap.en;
}
