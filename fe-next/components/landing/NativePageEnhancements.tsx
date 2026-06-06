import Link from 'next/link';
import Image from 'next/image';
import { getMascotBgTypeForSrc } from '@/components/ui/mascotData';

type SupportedLocale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface ModeRow {
  mode: string;
  tag: string;
  desc: string;
  href: string;
  mascot: string;
  accent: 'pink' | 'cyan' | 'lime' | 'purple';
}

interface BestForRow {
  tag: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
  color: 'pink' | 'cyan' | 'lime' | 'purple';
}

interface LocaleStrings {
  modesHeading: string;
  modesSubhead: string;
  bestForHeading: string;
  bestForSubhead: string;
  ctaHeading: string;
  ctaBody: string;
  ctaPrimary: string;
  ctaSecondary: string;
  modes: ModeRow[];
  bestFor: BestForRow[];
  reviewNote?: string;
}

const accentBorder: Record<ModeRow['accent'], string> = {
  pink: 'border-neo-pink text-neo-pink',
  cyan: 'border-neo-cyan text-neo-cyan',
  lime: 'border-neo-lime text-neo-lime',
  purple: 'border-neo-purple text-neo-purple',
};

const accentChip: Record<ModeRow['accent'], string> = {
  pink: 'bg-neo-pink text-neo-white',
  cyan: 'bg-neo-cyan text-neo-navy',
  lime: 'bg-neo-lime text-neo-navy',
  purple: 'bg-neo-purple text-neo-white',
};

const en: LocaleStrings = {
  modesHeading: '8 modes, not 1.',
  modesSubhead: 'Most word games give you one format. LexiClash gives you eight — pick the one that fits the moment.',
  bestForHeading: 'Best for your moment.',
  bestForSubhead: 'Real-time, async, classroom, family — there is a mode for it.',
  ctaHeading: 'Free. Browser. Now.',
  ctaBody: 'No download. No signup. Open the link, share with friends, play in 30 seconds.',
  ctaPrimary: 'Play Multiplayer Free',
  ctaSecondary: 'Daily Challenge',
  modes: [
    { mode: 'Multiplayer Grid Battle', tag: 'CORE', desc: 'Real-time word brawl — 2-20+ players race the same grid for 2-3 min.', href: 'multiplayer', mascot: '/mascot/dj.webp', accent: 'pink' },
    { mode: 'Word Hunt Survival', tag: 'DAILY', desc: 'Wordle-meets-Boggle. Find a hidden 4-6 letter target in 10 attempts.', href: 'daily/word-hunt', mascot: '/mascot/explorer.webp', accent: 'cyan' },
    { mode: 'Daily Word Wheel', tag: 'DAILY', desc: 'One letter wheel, the whole world plays it. Use the center letter, climb the leaderboard.', href: 'daily/word-wheel', mascot: '/mascot/scholar.webp', accent: 'lime' },
    { mode: 'Adventure', tag: 'STORY', desc: 'Roguelike word-crawler. Boss battles, abilities, loot. 5-8 rooms per run.', href: 'adventure', mascot: '/mascot/knight.webp', accent: 'purple' },
    { mode: 'Blast', tag: 'JUICE', desc: 'Fast-paced cascading combos. Tiles fall, chains explode. The arcade-y one.', href: 'singleplayer', mascot: '/mascot/bomber.webp', accent: 'pink' },
    { mode: 'Brain Drills', tag: 'TRAIN', desc: 'Quick vocabulary workouts: anagrams, definitions, spelling sprints. 60-second sets.', href: 'brain', mascot: '/mascot/flexing.webp', accent: 'purple' },
    { mode: 'Vocabulary Duels', tag: 'EDU', desc: '1v1 student-vs-student vocabulary battles. Teacher dashboard + custom word lists.', href: 'education', mascot: '/mascot/encouraging.webp', accent: 'lime' },
    { mode: 'Party Games', tag: 'PARTY', desc: 'TV + phone hybrid. Wheel Rush, Connections, Codenames-style group games.', href: 'multiplayer', mascot: '/mascot/celebration.webp', accent: 'cyan' },
  ],
  bestFor: [
    { tag: 'PARTIES', title: 'Best for parties & groups', desc: '20+ players in one room. Share a QR, everyone plays at once. No app, no setup.', cta: 'Start a party room', href: 'multiplayer', color: 'pink' },
    { tag: 'CLASSROOMS', title: 'Best for classrooms', desc: 'Vocabulary duels, custom word lists, teacher dashboard. Free, no student accounts needed.', cta: 'Open Education', href: 'education', color: 'lime' },
    { tag: 'FAMILY', title: 'Best for family game night', desc: 'Phone + tablet + TV. Same game everywhere. Ages 6+, all skill levels.', cta: 'Play with family', href: 'multiplayer', color: 'cyan' },
    { tag: 'ASYNC', title: 'Best as a Words With Friends replacement', desc: 'Daily challenges keep the streak alive. Fast 2-min sessions instead of days of waiting.', cta: 'Try Daily', href: 'daily', color: 'lime' },
    { tag: 'TEAMS', title: 'Best for remote team building', desc: 'Send a Slack link. 5-min icebreaker. No download, no IT approval, no friction.', cta: 'Spin up a room', href: 'multiplayer', color: 'pink' },
    { tag: 'LANGUAGE', title: 'Best for language learners', desc: '5 full dictionaries including Hebrew RTL and Japanese. Vocabulary practice in target language.', cta: 'Pick a language', href: 'multiplayer', color: 'purple' },
  ],
};

const he: LocaleStrings = {
  modesHeading: '8 מצבי משחק, לא אחד.',
  modesSubhead: 'רוב משחקי המילים נותנים לכם פורמט אחד. לקסיקלאש נותן שמונה — בחרו את זה שמתאים לרגע.',
  bestForHeading: 'הכי מתאים לרגע שלכם.',
  bestForSubhead: 'בזמן אמת, אסינכרוני, כיתה, משפחה — יש מצב לכל מצב.',
  ctaHeading: 'חינם. בדפדפן. עכשיו.',
  ctaBody: 'בלי הורדה, בלי הרשמה. פותחים קישור, שולחים לחברים, משחקים תוך 30 שניות.',
  ctaPrimary: 'שחקו בריבוי משתתפים — חינם',
  ctaSecondary: 'אתגר יומי',
  reviewNote: 'תרגום עברי דורש סקירה של דובר שפת אם',
  modes: [
    { mode: 'קרב מילים מרובה משתתפים', tag: 'ליבה', desc: 'קרב מילים בזמן אמת — 2-20 שחקנים מתחרים על אותו לוח במשך 2-3 דקות.', href: 'multiplayer', mascot: '/mascot/dj.webp', accent: 'pink' },
    { mode: 'ציד מילים יומי', tag: 'יומי', desc: 'מילון פוגש בוגל. מצאו מילה נסתרת בת 4-6 אותיות תוך 10 ניסיונות.', href: 'daily/word-hunt', mascot: '/mascot/explorer.webp', accent: 'cyan' },
    { mode: 'גלגל מילים יומי', tag: 'יומי', desc: 'גלגל אותיות אחד, כל העולם משחק. השתמשו באות המרכזית, טפסו בטבלה.', href: 'daily/word-wheel', mascot: '/mascot/scholar.webp', accent: 'lime' },
    { mode: 'הרפתקה', tag: 'סיפור', desc: 'מסע רוגלייק עם מילים. קרבות בוסים, יכולות, שלל. 5-8 חדרים בריצה.', href: 'adventure', mascot: '/mascot/knight.webp', accent: 'purple' },
    { mode: 'בלאסט', tag: "ג'וס", desc: 'קומבואים מפלים מהירים. אריחים נופלים, שרשראות מתפוצצות. המצב הארקייד.', href: 'singleplayer', mascot: '/mascot/bomber.webp', accent: 'pink' },
    { mode: 'תרגילי מוח', tag: 'אימון', desc: 'אימוני אוצר מילים מהירים: אנאגרמות, הגדרות, ספרינטים של איות. סטים של 60 שניות.', href: 'brain', mascot: '/mascot/flexing.webp', accent: 'purple' },
    { mode: 'דו-קרבות אוצר מילים', tag: 'חינוך', desc: 'קרבות 1 על 1 בין תלמידים. לוח בקרה למורה + רשימות מילים מותאמות.', href: 'education', mascot: '/mascot/encouraging.webp', accent: 'lime' },
    { mode: 'משחקי מסיבה', tag: 'מסיבה', desc: 'היברידי טלוויזיה+טלפון. וויל ראש, קונקשנס, משחקי קבוצה בסגנון קודנמס.', href: 'multiplayer', mascot: '/mascot/celebration.webp', accent: 'cyan' },
  ],
  bestFor: [
    { tag: 'מסיבות', title: 'הכי מתאים למסיבות וקבוצות', desc: '20+ שחקנים בחדר אחד. שתפו QR, כולם משחקים יחד. בלי אפליקציה, בלי הגדרות.', cta: 'פתחו חדר מסיבה', href: 'multiplayer', color: 'pink' },
    { tag: 'כיתות', title: 'הכי מתאים לכיתות', desc: 'דו-קרבות אוצר מילים, רשימות מותאמות, לוח בקרה למורה. חינם, ללא חשבונות תלמיד.', cta: 'פתחו את החינוך', href: 'education', color: 'lime' },
    { tag: 'משפחה', title: 'הכי מתאים לערב משפחתי', desc: 'טלפון + טאבלט + טלוויזיה. אותו משחק בכל מקום. גיל 6+, כל רמות המיומנות.', cta: 'שחקו עם המשפחה', href: 'multiplayer', color: 'cyan' },
    { tag: 'אסינק', title: 'תחליף ל-Words With Friends', desc: 'אתגרים יומיים שומרים על הרצף. מפגשים של 2 דקות במקום ימים של המתנה.', cta: 'נסו את היומי', href: 'daily', color: 'lime' },
    { tag: 'צוותים', title: 'בניית צוות מרחוק', desc: 'שלחו לינק לסלאק. שובר קרח של 5 דקות. בלי הורדה, בלי אישור IT, בלי חיכוך.', cta: 'פתחו חדר', href: 'multiplayer', color: 'pink' },
    { tag: 'שפות', title: 'לומדי שפות', desc: '5 מילונים מלאים כולל עברית (RTL) ויפנית. תרגול אוצר מילים בשפת היעד.', cta: 'בחרו שפה', href: 'multiplayer', color: 'purple' },
  ],
};

const sv: LocaleStrings = {
  modesHeading: '8 spellägen, inte 1.',
  modesSubhead: 'De flesta ordspel ger dig ett format. LexiClash ger dig åtta — välj det som passar stunden.',
  bestForHeading: 'Bäst för ditt tillfälle.',
  bestForSubhead: 'Realtid, asynkront, klassrum, familj — det finns ett läge för allt.',
  ctaHeading: 'Gratis. Webbläsare. Nu.',
  ctaBody: 'Ingen nedladdning, ingen registrering. Öppna länken, dela med vänner, spela på 30 sekunder.',
  ctaPrimary: 'Spela multiplayer gratis',
  ctaSecondary: 'Daglig utmaning',
  reviewNote: 'Svensk översättning behöver granskning av modersmålstalare',
  modes: [
    { mode: 'Multiplayer-rutbatalj', tag: 'KÄRNA', desc: 'Realtidsordkamp — 2-20+ spelare tävlar på samma rutnät i 2-3 minuter.', href: 'multiplayer', mascot: '/mascot/dj.webp', accent: 'pink' },
    { mode: 'Word Hunt Survival', tag: 'DAGLIG', desc: 'Wordle möter Boggle. Hitta ett dolt 4-6 bokstäver långt målord på 10 försök.', href: 'daily/word-hunt', mascot: '/mascot/explorer.webp', accent: 'cyan' },
    { mode: 'Dagligt Ordhjul', tag: 'DAGLIG', desc: 'Ett bokstavshjul, hela världen spelar. Använd mittbokstaven, klättra på topplistan.', href: 'daily/word-wheel', mascot: '/mascot/scholar.webp', accent: 'lime' },
    { mode: 'Äventyr', tag: 'STORY', desc: 'Roguelike-ordresa. Bossstrider, förmågor, byte. 5-8 rum per körning.', href: 'adventure', mascot: '/mascot/knight.webp', accent: 'purple' },
    { mode: 'Blast', tag: 'JUICE', desc: 'Snabba kaskadkombos. Brickor faller, kedjor exploderar. Den arkadiga.', href: 'singleplayer', mascot: '/mascot/bomber.webp', accent: 'pink' },
    { mode: 'Hjärnträning', tag: 'TRÄNA', desc: 'Snabba ordförrådsövningar: anagram, definitioner, stavningssprint. 60-sekunders set.', href: 'brain', mascot: '/mascot/flexing.webp', accent: 'purple' },
    { mode: 'Ordduel', tag: 'EDU', desc: '1v1 elev-mot-elev ordförrådsstrider. Lärardashboard + anpassade ordlistor.', href: 'education', mascot: '/mascot/encouraging.webp', accent: 'lime' },
    { mode: 'Festspel', tag: 'FEST', desc: 'TV + telefonhybrid. Wheel Rush, Connections, Codenames-stilade gruppspel.', href: 'multiplayer', mascot: '/mascot/celebration.webp', accent: 'cyan' },
  ],
  bestFor: [
    { tag: 'FESTER', title: 'Bäst för fester & grupper', desc: '20+ spelare i ett rum. Dela en QR, alla spelar samtidigt. Ingen app, ingen installation.', cta: 'Starta ett festrum', href: 'multiplayer', color: 'pink' },
    { tag: 'KLASSRUM', title: 'Bäst för klassrum', desc: 'Ordduel, anpassade ordlistor, lärardashboard. Gratis, inga elevkonton behövs.', cta: 'Öppna utbildning', href: 'education', color: 'lime' },
    { tag: 'FAMILJ', title: 'Bäst för familjekvällen', desc: 'Telefon + surfplatta + TV. Samma spel överallt. Åldrar 6+, alla nivåer.', cta: 'Spela med familjen', href: 'multiplayer', color: 'cyan' },
    { tag: 'ASYNK', title: 'Bäst som Words With Friends-ersättare', desc: 'Dagliga utmaningar håller streaken vid liv. Snabba 2-min sessioner istället för dagars väntan.', cta: 'Prova Dagligt', href: 'daily', color: 'lime' },
    { tag: 'TEAM', title: 'Bäst för fjärrteambuilding', desc: 'Skicka en Slack-länk. 5-min isbrytare. Ingen nedladdning, inget IT-godkännande, ingen friktion.', cta: 'Starta ett rum', href: 'multiplayer', color: 'pink' },
    { tag: 'SPRÅK', title: 'Bäst för språkinlärare', desc: '5 fullständiga ordböcker inklusive hebreiska (RTL) och japanska. Ordförrådsträning på målspråket.', cta: 'Välj ett språk', href: 'multiplayer', color: 'purple' },
  ],
};

const ja: LocaleStrings = {
  modesHeading: '8つのモード、1つではなく。',
  modesSubhead: 'ほとんどの単語ゲームは1つの形式しか提供しません。LexiClashは8つを提供します — その瞬間に合うものを選んでください。',
  bestForHeading: 'あなたの瞬間に最適。',
  bestForSubhead: 'リアルタイム、非同期、教室、家族 — 全てにモードがあります。',
  ctaHeading: '無料。ブラウザ。今すぐ。',
  ctaBody: 'ダウンロード不要、登録不要。リンクを開いて、友達と共有、30秒でプレイ開始。',
  ctaPrimary: 'マルチプレイヤーを無料で',
  ctaSecondary: 'デイリーチャレンジ',
  reviewNote: '日本語翻訳はネイティブレビューが必要です',
  modes: [
    { mode: 'マルチプレイヤーグリッド対戦', tag: 'コア', desc: 'リアルタイム単語バトル — 2-20+人が同じグリッドで2-3分間競う。', href: 'multiplayer', mascot: '/mascot/dj.webp', accent: 'pink' },
    { mode: 'ワードハント・サバイバル', tag: 'デイリー', desc: 'WordleとBoggleの融合。隠された4-6文字のターゲット語を10回で見つける。', href: 'daily/word-hunt', mascot: '/mascot/explorer.webp', accent: 'cyan' },
    { mode: 'デイリー・ワードホイール', tag: 'デイリー', desc: '1つの文字ホイール、世界中がプレイ。中央の文字を使ってリーダーボードを登る。', href: 'daily/word-wheel', mascot: '/mascot/scholar.webp', accent: 'lime' },
    { mode: 'アドベンチャー', tag: 'ストーリー', desc: 'ローグライク単語クロウラー。ボス戦、アビリティ、戦利品。1ランあたり5-8部屋。', href: 'adventure', mascot: '/mascot/knight.webp', accent: 'purple' },
    { mode: 'ブラスト', tag: 'ジュース', desc: '高速カスケードコンボ。タイルが落ち、連鎖が爆発。アーケード風モード。', href: 'singleplayer', mascot: '/mascot/bomber.webp', accent: 'pink' },
    { mode: 'ブレインドリル', tag: 'トレーニング', desc: '素早い語彙ワークアウト:アナグラム、定義、スペリングスプリント。60秒セット。', href: 'brain', mascot: '/mascot/flexing.webp', accent: 'purple' },
    { mode: '語彙デュエル', tag: '教育', desc: '生徒対生徒の1v1語彙バトル。教師ダッシュボード + カスタム単語リスト。', href: 'education', mascot: '/mascot/encouraging.webp', accent: 'lime' },
    { mode: 'パーティーゲーム', tag: 'パーティー', desc: 'TV + 電話ハイブリッド。Wheel Rush、Connections、Codenamesスタイルのグループゲーム。', href: 'multiplayer', mascot: '/mascot/celebration.webp', accent: 'cyan' },
  ],
  bestFor: [
    { tag: 'パーティー', title: 'パーティーやグループに最適', desc: '1部屋に20+人。QRを共有、全員同時プレイ。アプリ不要、セットアップ不要。', cta: 'パーティールーム開始', href: 'multiplayer', color: 'pink' },
    { tag: '教室', title: '教室に最適', desc: '語彙デュエル、カスタム単語リスト、教師ダッシュボード。無料、生徒アカウント不要。', cta: '教育を開く', href: 'education', color: 'lime' },
    { tag: '家族', title: '家族のゲームナイトに最適', desc: '電話 + タブレット + TV。どこでも同じゲーム。6歳以上、全レベル対応。', cta: '家族で遊ぶ', href: 'multiplayer', color: 'cyan' },
    { tag: '非同期', title: 'Words With Friendsの代替に最適', desc: 'デイリーチャレンジでストリークを維持。何日も待つ代わりに2分の高速セッション。', cta: 'デイリーを試す', href: 'daily', color: 'lime' },
    { tag: 'チーム', title: 'リモートチームビルディングに最適', desc: 'Slackリンクを送信。5分のアイスブレイク。ダウンロード不要、IT承認不要、摩擦なし。', cta: 'ルームを起動', href: 'multiplayer', color: 'pink' },
    { tag: '言語', title: '言語学習者に最適', desc: 'ヘブライ語(RTL)と日本語を含む5つの完全な辞書。ターゲット言語での語彙練習。', cta: '言語を選ぶ', href: 'multiplayer', color: 'purple' },
  ],
};

const es: LocaleStrings = {
  modesHeading: '8 modos, no 1.',
  modesSubhead: 'La mayoría de los juegos de palabras te dan un formato. LexiClash te da ocho — elige el que se adapte al momento.',
  bestForHeading: 'Mejor para tu momento.',
  bestForSubhead: 'Tiempo real, asíncrono, aula, familia — hay un modo para cada caso.',
  ctaHeading: 'Gratis. Navegador. Ahora.',
  ctaBody: 'Sin descarga, sin registro. Abre el enlace, comparte con amigos, juega en 30 segundos.',
  ctaPrimary: 'Jugar Multijugador Gratis',
  ctaSecondary: 'Desafío Diario',
  reviewNote: 'La traducción al español necesita revisión de un hablante nativo',
  modes: [
    { mode: 'Batalla de Cuadrícula Multijugador', tag: 'PRINCIPAL', desc: 'Pelea de palabras en tiempo real — 2-20+ jugadores compiten en la misma cuadrícula durante 2-3 min.', href: 'multiplayer', mascot: '/mascot/dj.webp', accent: 'pink' },
    { mode: 'Caza de Palabras Diaria', tag: 'DIARIO', desc: 'Wordle se encuentra con Boggle. Encuentra una palabra objetivo oculta de 4-6 letras en 10 intentos.', href: 'daily/word-hunt', mascot: '/mascot/explorer.webp', accent: 'cyan' },
    { mode: 'Rueda de Palabras Diaria', tag: 'DIARIO', desc: 'Una rueda de letras, todo el mundo juega. Usa la letra central, sube en la clasificación global.', href: 'daily/word-wheel', mascot: '/mascot/scholar.webp', accent: 'lime' },
    { mode: 'Aventura', tag: 'HISTORIA', desc: 'Roguelike de palabras. Batallas de jefes, habilidades, botín. 5-8 salas por partida.', href: 'adventure', mascot: '/mascot/knight.webp', accent: 'purple' },
    { mode: 'Blast', tag: 'JUICE', desc: 'Combos en cascada rápidos. Las fichas caen, las cadenas explotan. El modo arcade.', href: 'singleplayer', mascot: '/mascot/bomber.webp', accent: 'pink' },
    { mode: 'Ejercicios Mentales', tag: 'ENTRENA', desc: 'Entrenamientos de vocabulario rápidos: anagramas, definiciones, sprints de ortografía. Sets de 60 seg.', href: 'brain', mascot: '/mascot/flexing.webp', accent: 'purple' },
    { mode: 'Duelos de Vocabulario', tag: 'EDU', desc: 'Batallas de vocabulario 1v1 entre estudiantes. Panel del profesor + listas personalizadas.', href: 'education', mascot: '/mascot/encouraging.webp', accent: 'lime' },
    { mode: 'Juegos de Fiesta', tag: 'FIESTA', desc: 'Híbrido TV + teléfono. Wheel Rush, Connections, juegos grupales estilo Codenames.', href: 'multiplayer', mascot: '/mascot/celebration.webp', accent: 'cyan' },
  ],
  bestFor: [
    { tag: 'FIESTAS', title: 'Mejor para fiestas y grupos', desc: '20+ jugadores en una sala. Comparte un QR, todos juegan a la vez. Sin app, sin configuración.', cta: 'Iniciar sala de fiesta', href: 'multiplayer', color: 'pink' },
    { tag: 'AULAS', title: 'Mejor para aulas', desc: 'Duelos de vocabulario, listas personalizadas, panel del profesor. Gratis, sin cuentas de estudiantes.', cta: 'Abrir Educación', href: 'education', color: 'lime' },
    { tag: 'FAMILIA', title: 'Mejor para noche familiar', desc: 'Teléfono + tableta + TV. Mismo juego en todas partes. Edades 6+, todos los niveles.', cta: 'Jugar en familia', href: 'multiplayer', color: 'cyan' },
    { tag: 'ASÍNCRONO', title: 'Mejor reemplazo de Words With Friends', desc: 'Desafíos diarios mantienen viva la racha. Sesiones rápidas de 2 min en lugar de días de espera.', cta: 'Probar Diario', href: 'daily', color: 'lime' },
    { tag: 'EQUIPOS', title: 'Mejor para team building remoto', desc: 'Envía un enlace de Slack. Rompehielos de 5 min. Sin descarga, sin aprobación de TI, sin fricción.', cta: 'Iniciar sala', href: 'multiplayer', color: 'pink' },
    { tag: 'IDIOMAS', title: 'Mejor para aprendices de idiomas', desc: '5 diccionarios completos incluyendo hebreo (RTL) y japonés. Práctica de vocabulario en el idioma objetivo.', cta: 'Elegir idioma', href: 'multiplayer', color: 'purple' },
  ],
};

const localeContent: Record<SupportedLocale, LocaleStrings> = { en, he, sv, ja, es };

interface Props {
  locale: string;
}

export default function NativePageEnhancements({ locale }: Props) {
  const lang = (['en', 'he', 'sv', 'ja', 'es'].includes(locale) ? locale : 'en') as SupportedLocale;
  const c = localeContent[lang];
  const isRtl = lang === 'he';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="my-16 space-y-16">
      {/* 8 GAME MODES */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-neo-display text-3xl font-black uppercase leading-tight sm:text-4xl">
            {c.modesHeading}
          </h2>
        </div>
        <p className="mb-8 max-w-2xl text-neo-gray-200">{c.modesSubhead}</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {c.modes.map((m, i) => (
            <Link
              key={m.mode}
              href={`/${locale}/${m.href}`}
              className={`group relative flex flex-col gap-3 rounded-neo border-4 border-neo-black bg-neo-navy-light p-5 shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl ${accentBorder[m.accent]}`}
              style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
            >
              <span className={`absolute -right-2 -top-3 inline-block rotate-[6deg] rounded border-3 border-neo-black px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest shadow-hard ${accentChip[m.accent]}`}>
                {m.tag}
              </span>
              <div data-mascot-bg={getMascotBgTypeForSrc(m.mascot)} className="relative h-16 w-16">
                <Image src={m.mascot} alt="" fill sizes="64px" className="object-contain" />
              </div>
              <h3 className="font-neo-display text-lg font-black leading-tight">{m.mode}</h3>
              <p className="text-xs text-neo-gray-200">{m.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* BEST FOR BUCKETS */}
      <section>
        <h2 className="mb-2 font-neo-display text-3xl font-black uppercase sm:text-4xl">{c.bestForHeading}</h2>
        <p className="mb-8 max-w-2xl text-neo-gray-200">{c.bestForSubhead}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.bestFor.map((b, i) => (
            <div
              key={b.title}
              className={`relative rounded-neo border-4 border-neo-black bg-neo-navy-light p-5 shadow-hard-lg ${accentBorder[b.color]}`}
              style={{ transform: i % 2 === 0 ? 'rotate(-0.5deg)' : 'rotate(0.5deg)' }}
            >
              <span className={`absolute -top-3 left-4 rotate-[-3deg] rounded border-3 border-neo-black px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest shadow-hard ${accentChip[b.color]}`}>{b.tag}</span>
              <h3 className="mt-3 font-neo-display text-lg font-black leading-tight">{b.title}</h3>
              <p className="mt-2 text-sm text-neo-gray-200">{b.desc}</p>
              <Link href={`/${locale}/${b.href}`} className="mt-4 inline-flex items-center gap-1 font-neo-display text-xs font-black uppercase tracking-widest">
                {b.cta} {isRtl ? '←' : '→'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="relative overflow-hidden rounded-neo border-4 border-neo-black bg-neo-yellow p-6 text-neo-navy shadow-hard-xl sm:p-10">
        <div className="absolute inset-0 texture-halftone-comic opacity-30" aria-hidden="true" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="font-neo-display text-3xl font-black leading-[0.95] sm:text-4xl">{c.ctaHeading}</h2>
            <p className="mt-3 max-w-xl text-base font-bold sm:text-lg">{c.ctaBody}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-3 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard-lg transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-xl">▶ {c.ctaPrimary}</Link>
              <Link href={`/${locale}/daily`} className="rounded-neo border-4 border-neo-black bg-neo-navy px-6 py-3 text-center font-neo-display font-black uppercase tracking-wider text-neo-lime shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg">★ {c.ctaSecondary}</Link>
            </div>
            {c.reviewNote && (
              <p className="mt-3 text-[10px] uppercase tracking-widest opacity-60">{c.reviewNote}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
