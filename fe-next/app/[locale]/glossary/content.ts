export type GlossaryTerm = {
  term: string;
  definition: string;
  related?: string[];
};

export type GlossaryContent = {
  title: string;
  subtitle: string;
  terms: GlossaryTerm[];
};

const enTerms: GlossaryTerm[] = [
  { term: 'Blast Mode', definition: 'A fast-paced game mode where submitting words quickly builds combo chains for multiplied scores. Features special tile effects like fire, ice, bomb, and lightning.', related: ['Combo', 'Tile'] },
  { term: 'Blast Move', definition: 'Special abilities usable during Blast mode gameplay, including Shuffle (rearrange tiles), Hint (reveal a word), and Time Freeze (pause timer).', related: ['Blast Mode', 'Hint'] },
  { term: 'Board', definition: 'The grid of letter tiles where players find and trace words. Board size and layout vary by game mode.', related: ['Grid', 'Tile'] },
  { term: 'Bomb Tile', definition: 'A special tile in Blast mode that explodes a 3x3 area when used in a word, clearing 9 tiles at once.', related: ['Blast Mode', 'Tile'] },
  { term: 'Combo', definition: 'A scoring mechanic in Blast mode where submitting words consecutively within a time window builds combo levels, each increasing the score multiplier.', related: ['Combo Chain', 'Combo Multiplier'] },
  { term: 'Combo Chain', definition: 'An unbroken sequence of words submitted within the combo time window. Longer chains mean higher multipliers and more points.', related: ['Combo', 'Combo Multiplier'] },
  { term: 'Combo Multiplier', definition: 'The score multiplier earned through combo chains. Starts at 1x and increases with each consecutive word: 1.5x, 2x, 2.5x, 3x, and beyond.', related: ['Combo', 'Score'] },
  { term: 'Coins', definition: 'In-game currency earned by playing games. Used to purchase cosmetics, power-ups, and other items. Earned based on score performance.', related: ['Score', 'XP'] },
  { term: 'Daily Buzz', definition: 'A special daily challenge featuring a trending topic or theme. The board image and words relate to current events or cultural moments.', related: ['Daily Challenge'] },
  { term: 'Daily Challenge', definition: 'A once-per-day puzzle where all players worldwide receive the same board. Compare scores on the global leaderboard.', related: ['Leaderboard', 'Word Hunt'] },
  { term: 'Fire Round', definition: 'An intensified round in certain game modes where the timer is shorter but points are doubled.', related: ['Timer'] },
  { term: 'Fire Tile', definition: 'A special tile in Blast mode (red glow) that clears its entire row when used in a word.', related: ['Blast Mode', 'Tile'] },
  { term: 'Grid', definition: 'The arrangement of letter tiles on the board. Standard grids are 4x4 or 5x5. Letters can connect horizontally, vertically, or diagonally.', related: ['Board', 'Tile'] },
  { term: 'Hint', definition: 'A power-up that reveals a valid word on the board (Classic/Blast) or a correct letter position (Word Hunt). Limited uses per game.', related: ['Blast Move'] },
  { term: 'Ice Tile', definition: 'A special tile in Blast mode (blue shimmer) that freezes adjacent tiles in place when triggered, preventing them from moving during cascades.', related: ['Blast Mode', 'Tile'] },
  { term: 'Leaderboard', definition: 'Rankings showing top players by score, streak, or other metrics. Includes daily, weekly, and all-time boards.', related: ['Score', 'MMR'] },
  { term: 'Lightning Tile', definition: 'A special tile in Blast mode (yellow spark) that clears its entire column when used in a word.', related: ['Blast Mode', 'Tile'] },
  { term: 'Lobby', definition: 'The multiplayer waiting room where players gather before a game starts. The host can configure game settings and start the match.', related: ['Multiplayer', 'Room'] },
  { term: 'MMR', definition: 'Matchmaking Rating. A hidden skill rating used to match players of similar ability in ranked multiplayer games.', related: ['Ranked Mode', 'Multiplayer'] },
  { term: 'Multiplayer', definition: 'Game mode where 2-8 players compete in real-time on the same board via WebSocket connections. Supports Classic, Blast, and Word Hunt modes.', related: ['Lobby', 'Room'] },
  { term: 'Neo-Brutalist', definition: 'The visual design style of LexiClash, characterized by bold borders, hard shadows (no blur), chunky typography, and high-contrast colors.', related: [] },
  { term: 'Ranked Mode', definition: 'Competitive multiplayer where wins and losses affect your MMR. Players are matched based on skill level.', related: ['MMR', 'Multiplayer'] },
  { term: 'Rarity Multiplier', definition: 'A bonus scoring factor applied to uncommon or rare words. Less frequently used valid words earn higher multipliers.', related: ['Score'] },
  { term: 'Room', definition: 'A multiplayer game session. Each room has a unique code that players can share to invite others.', related: ['Lobby', 'Multiplayer'] },
  { term: 'Score', definition: 'Points earned for finding valid words. Base score equals word length minus one. Modified by combo multipliers, rarity bonuses, and game mode.', related: ['Combo Multiplier', 'Rarity Multiplier'] },
  { term: 'Series', definition: 'A set of consecutive multiplayer games played in the same room. Series tracking shows win/loss records between players.', related: ['Multiplayer'] },
  { term: 'Single Player', definition: 'Game modes played against AI opponents or solo. Includes Classic, Blast, and practice modes without real-time opponents.', related: [] },
  { term: 'Spectator', definition: 'A player who watches a multiplayer game without participating. Spectators can see the board and scores but cannot submit words.', related: ['Multiplayer'] },
  { term: 'Streak', definition: 'The number of consecutive days a player has completed at least one game. Maintaining streaks earns bonus rewards.', related: ['Daily Challenge'] },
  { term: 'Target Word', definition: 'The hidden word players must guess in Word Hunt mode. Feedback clues (green, yellow, gray) guide players toward the answer.', related: ['Word Hunt'] },
  { term: 'Tile', definition: 'An individual letter cell on the game board. Tiles can be selected and connected to form words. Special tiles have additional effects in Blast mode.', related: ['Board', 'Grid'] },
  { term: 'Timer', definition: 'The countdown clock that limits game duration. When it reaches zero, the round ends and scores are finalized.', related: ['Fire Round'] },
  { term: 'Vocabulary', definition: 'The dictionary of valid words accepted by the game. LexiClash supports multiple language dictionaries for Hebrew, English, Swedish, Japanese, and Spanish.', related: ['Word Validation'] },
  { term: 'Word Hunt', definition: 'A Wordle-inspired puzzle mode where players guess a hidden target word with limited attempts. Color-coded clues indicate correct letters and positions.', related: ['Target Word', 'Daily Challenge'] },
  { term: 'Word Validation', definition: 'The process of checking whether a submitted word exists in the game dictionary. Invalid words are rejected and do not score points.', related: ['Vocabulary'] },
  { term: 'XP', definition: 'Experience Points earned through gameplay. Accumulating XP increases your player level, unlocking cosmetic rewards and achievements.', related: ['Coins', 'Score'] },
];

export const contentByLocale: Record<string, GlossaryContent> = {
  en: {
    title: 'LexiClash Glossary: Game Terms A-Z',
    subtitle: 'Complete reference of all game mechanics, modes, and terminology used in LexiClash.',
    terms: enTerms,
  },
  he: {
    title: 'מילון מונחים של לקסיקלאש: מונחי משחק א-ת',
    subtitle: 'מדריך מלא לכל מכניקות המשחק, המצבים והמונחים בלקסיקלאש.',
    terms: [
      { term: 'מצב בלאסט', definition: 'מצב משחק מהיר שבו הגשת מילים בזריזות בונה שרשראות קומבו לניקוד מוכפל. כולל אפקטי אריחים מיוחדים כמו אש, קרח, פצצה וברק.', related: ['קומבו', 'אריח'] },
      { term: 'מהלך בלאסט', definition: 'יכולות מיוחדות בזמן משחק בלאסט, כולל ערבוב (סידור מחדש), רמז (חשיפת מילה) והקפאת זמן (השהיית טיימר).', related: ['מצב בלאסט', 'רמז'] },
      { term: 'לוח', definition: 'רשת אריחי האותיות שבה שחקנים מוצאים ומאתרים מילים. גודל הלוח משתנה לפי מצב משחק.', related: ['רשת', 'אריח'] },
      { term: 'אריח פצצה', definition: 'אריח מיוחד במצב בלאסט שמפוצץ אזור 3x3 כשמשתמשים בו במילה, מנקה 9 אריחים בבת אחת.', related: ['מצב בלאסט'] },
      { term: 'קומבו', definition: 'מכניקת ניקוד במצב בלאסט שבה הגשת מילים ברצף בתוך חלון זמן בונה רמות קומבו, כל אחת מגדילה את מכפיל הניקוד.', related: ['שרשרת קומבו', 'מכפיל קומבו'] },
      { term: 'שרשרת קומבו', definition: 'רצף רציף של מילים שהוגשו בתוך חלון זמן הקומבו. שרשראות ארוכות יותר = מכפילים גבוהים יותר.', related: ['קומבו'] },
      { term: 'מכפיל קומבו', definition: 'מכפיל הניקוד שנצבר דרך שרשראות קומבו. מתחיל ב-1x ועולה עם כל מילה רצופה.', related: ['קומבו', 'ניקוד'] },
      { term: 'מטבעות', definition: 'מטבע במשחק שנצבר ממשחקים. משמש לרכישת קוסמטיקה, חיזוקים ופריטים אחרים.', related: ['ניקוד', 'XP'] },
      { term: 'באז יומי', definition: 'אתגר יומי מיוחד הכולל נושא טרנדי. תמונת הלוח והמילים קשורות לאירועים אקטואליים.', related: ['אתגר יומי'] },
      { term: 'אתגר יומי', definition: 'חידה פעם ביום שבה כל השחקנים מקבלים את אותו לוח. השוו ניקוד בטבלת המובילים הגלובלית.', related: ['טבלת מובילים', 'ציד מילים'] },
      { term: 'סיבוב אש', definition: 'סיבוב מוגבר שבו הטיימר קצר יותר אבל הנקודות מוכפלות.', related: ['טיימר'] },
      { term: 'אריח אש', definition: 'אריח מיוחד במצב בלאסט (זוהר אדום) שמנקה את כל השורה כשמשתמשים בו במילה.', related: ['מצב בלאסט', 'אריח'] },
      { term: 'רשת', definition: 'סידור אריחי האותיות על הלוח. רשתות סטנדרטיות הן 4x4 או 5x5. אותיות מתחברות אופקית, אנכית או אלכסונית.', related: ['לוח', 'אריח'] },
      { term: 'רמז', definition: 'חיזוק שחושף מילה חוקית על הלוח או מיקום אות נכון בציד מילים. שימושים מוגבלים למשחק.', related: ['מהלך בלאסט'] },
      { term: 'אריח קרח', definition: 'אריח מיוחד במצב בלאסט (נצנוץ כחול) שמקפיא אריחים סמוכים כשמופעל.', related: ['מצב בלאסט'] },
      { term: 'טבלת מובילים', definition: 'דירוגים המציגים שחקנים מובילים לפי ניקוד, רצף או מדדים אחרים.', related: ['ניקוד', 'MMR'] },
      { term: 'אריח ברק', definition: 'אריח מיוחד במצב בלאסט (ניצוץ צהוב) שמנקה את כל העמודה כשמשתמשים בו.', related: ['מצב בלאסט'] },
      { term: 'לובי', definition: 'חדר המתנה מרובה משתתפים שבו שחקנים מתאספים לפני תחילת משחק.', related: ['מרובה משתתפים', 'חדר'] },
      { term: 'MMR', definition: 'דירוג התאמה. דירוג מיומנות נסתר המשמש להתאמת שחקנים ברמה דומה.', related: ['מצב מדורג', 'מרובה משתתפים'] },
      { term: 'מרובה משתתפים', definition: 'מצב משחק שבו 2-8 שחקנים מתחרים בזמן אמת על אותו לוח.', related: ['לובי', 'חדר'] },
      { term: 'ניאו-ברוטליסט', definition: 'סגנון העיצוב החזותי של לקסיקלאש, המאופיין בגבולות בולטים, צללים קשיחים, טיפוגרפיה שמנה וצבעים בניגודיות גבוהה.', related: [] },
      { term: 'מצב מדורג', definition: 'מרובה משתתפים תחרותי שבו ניצחונות והפסדים משפיעים על ה-MMR.', related: ['MMR'] },
      { term: 'מכפיל נדירות', definition: 'בונוס ניקוד המוחל על מילים לא שכיחות או נדירות.', related: ['ניקוד'] },
      { term: 'חדר', definition: 'סשן משחק מרובה משתתפים. לכל חדר קוד ייחודי לשיתוף.', related: ['לובי'] },
      { term: 'ניקוד', definition: 'נקודות שנצברות ממציאת מילים חוקיות. ניקוד בסיס = אורך מילה פחות אחד.', related: ['מכפיל קומבו'] },
      { term: 'סדרה', definition: 'קבוצת משחקים רצופים באותו חדר. מעקב סדרות מציג רשומות נצחון/הפסד.', related: ['מרובה משתתפים'] },
      { term: 'שחקן יחיד', definition: 'מצבי משחק נגד AI או סולו.', related: [] },
      { term: 'צופה', definition: 'שחקן שצופה במשחק מרובה משתתפים בלי להשתתף. צופים רואים את הלוח והניקוד אבל לא יכולים להגיש מילים.', related: ['מרובה משתתפים'] },
      { term: 'רצף', definition: 'מספר הימים הרצופים ששחקן השלים לפחות משחק אחד. שמירה על רצפים מרוויחה בונוסים.', related: ['אתגר יומי'] },
      { term: 'מילת יעד', definition: 'המילה הנסתרת שעל שחקנים לנחש במצב ציד מילים. רמזי משוב (ירוק, צהוב, אפור) מנחים לתשובה.', related: ['ציד מילים'] },
      { term: 'אריח', definition: 'תא אות בודד על לוח המשחק. אריחים נבחרים ומתחברים ליצירת מילים.', related: ['לוח', 'רשת'] },
      { term: 'טיימר', definition: 'שעון הספירה לאחור שמגביל את משך המשחק.', related: ['סיבוב אש'] },
      { term: 'אוצר מילים', definition: 'מילון המילים החוקיות שהמשחק מקבל. לקסיקלאש תומך במילונים בעברית, אנגלית, שוודית, יפנית וספרדית.', related: ['אימות מילים'] },
      { term: 'ציד מילים', definition: 'מצב חידה בהשראת וורדל שבו שחקנים מנחשים מילה נסתרת עם ניסיונות מוגבלים. רמזים צבעוניים מציינים אותיות ומיקומים נכונים.', related: ['מילת יעד', 'אתגר יומי'] },
      { term: 'אימות מילים', definition: 'תהליך בדיקה אם מילה שהוגשה קיימת במילון המשחק. מילים לא חוקיות נדחות ולא מקבלות נקודות.', related: ['אוצר מילים'] },
      { term: 'XP', definition: 'נקודות ניסיון שנצברות ממשחק. צבירת XP מעלה את רמת השחקן ופותחת תגמולים קוסמטיים והישגים.', related: ['מטבעות', 'ניקוד'] },
    ],
  },
  sv: {
    title: 'LexiClash Ordlista: Speltermer A-O',
    subtitle: 'Komplett referens for alla spelmekaniker, laaagen och terminologi i LexiClash.',
    terms: enTerms.map(t => ({ ...t })), // Use English terms as fallback for sv
  },
  ja: {
    title: 'LexiClash 用語集：ゲーム用語 A-Z',
    subtitle: 'LexiClashで使用されるすべてのゲームメカニクス、モード、用語の完全なリファレンス。',
    terms: enTerms.map(t => ({ ...t })),
  },
  es: {
    title: 'Glosario de LexiClash: Terminos del Juego A-Z',
    subtitle: 'Referencia completa de todas las mecanicas, modos y terminologia del juego LexiClash.',
    terms: enTerms.map(t => ({ ...t })),
  },
};
