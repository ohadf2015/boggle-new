/**
 * Constants and configuration for Daily Buzz Challenge Generator
 * Centralized values used across buzz modules
 */

/**
 * Language to region mapping
 */
export const REGION_MAP: Record<string, string> = {
  en: 'US',
  he: 'IL',
  sv: 'SE',
  ja: 'JP',
  es: 'ES',
};

/**
 * Minimum answer length by language for Daily Challenge word hunt
 * Re-exported from shared constants for backwards compatibility
 * @see @/shared/constants/gameConstants.ts for the canonical definition
 */
export { MIN_ANSWER_LENGTH, getMinAnswerLength } from '@/shared/constants/gameConstants';

/**
 * Maximum answer length for all languages
 */
export const MAX_ANSWER_LENGTH = 15;

/**
 * Wordle challenge word length by language
 * English: 5 letters (standard Wordle)
 * Hebrew: 4 letters (typical Hebrew word length)
 * Swedish: 5 letters (like English)
 * Japanese: 4 characters (kanji/kana compounds)
 * Spanish: 5 letters (like English)
 */
export const WORDLE_WORD_LENGTH: Record<string, number> = {
  en: 5,
  he: 4,
  sv: 5,
  ja: 4,
  es: 5,
};

/**
 * @deprecated Use WORDLE_WORD_LENGTH[language] instead
 * Kept for backward compatibility
 */
export const WORDLE_WORD_LENGTH_DEFAULT = 5;

/**
 * Vertex AI Gemini model configuration
 */
export const GEMINI_MODEL = process.env.VERTEX_AI_MODEL || 'gemini-2.5-pro';

/**
 * Thinking budget for extended reasoning (0 = disabled)
 * Max: 32768 for 2.5-pro, 24576 for 2.5-flash
 *
 * IMPORTANT: Set to 0 by default to avoid timeout issues.
 * Gemini 2.5 Pro with thinking enabled has known latency problems
 * that can exceed the 90-second timeout, especially during peak usage.
 * See: https://discuss.ai.google.dev/t/very-slow-response-time-on-the-new-2-5-pro-0605-model/87456
 *
 * To re-enable thinking for potentially higher quality (but slower) generation,
 * set VERTEX_AI_THINKING_BUDGET=8192 in environment variables.
 */
export const THINKING_BUDGET = parseInt(process.env.VERTEX_AI_THINKING_BUDGET || '0', 10);

/**
 * Timeout for AI generation requests (in milliseconds)
 * Must be less than API route maxDuration to allow for proper error handling
 */
export const AI_GENERATION_TIMEOUT_MS = 90_000; // 90 seconds for full generation
export const AI_SINGLE_CHALLENGE_TIMEOUT_MS = 50_000; // 50 seconds for single challenge regeneration
export const REGEN_FUNCTION_TIMEOUT_MS = 60_000; // 60 seconds to leave buffer for API's 70s maxDuration

/**
 * Maximum sports trends to allow in filtered results
 */
export const MAX_SPORTS_IN_FILTER = 1;

/**
 * Categories to deprioritize (sports is often over-represented in trends)
 */
export const LOW_PRIORITY_CATEGORIES = [
  'Sports',
  'Soccer',
  'Football',
  'Basketball',
  'Tennis',
  'Baseball',
];

/**
 * Sports keywords for detecting sport riddles (English - legacy)
 */
export const SPORTS_KEYWORDS = [
  'sport', 'soccer', 'football', 'basketball', 'tennis', 'baseball', 'hockey',
  'golf', 'cricket', 'rugby', 'volleyball', 'boxing', 'wrestling', 'marathon',
  'olympics', 'athlete', 'championship', 'league', 'nba', 'nfl', 'mlb', 'fifa',
  'game', 'match', 'score', 'team', 'player', 'coach', 'stadium', 'ball',
];

/**
 * Multi-language sports keywords for filtering trends across all supported languages
 */
export const SPORTS_KEYWORDS_BY_LANGUAGE: Record<string, string[]> = {
  en: [
    'sport', 'sports', 'soccer', 'football', 'basketball', 'tennis', 'baseball', 'hockey',
    'golf', 'cricket', 'rugby', 'volleyball', 'boxing', 'wrestling', 'marathon',
    'olympics', 'olympic', 'athlete', 'championship', 'league', 'nba', 'nfl', 'mlb', 'fifa',
    'match', 'score', 'team', 'player', 'coach', 'stadium', 'ball', 'cup', 'goal',
    'super bowl', 'world cup', 'playoffs', 'finals', 'semifinals', 'quarterfinals',
    'ufc', 'mma', 'f1', 'formula 1', 'nascar', 'pga', 'wimbledon', 'us open',
  ],
  he: [
    'ספורט', 'כדורגל', 'כדורסל', 'טניס', 'בייסבול', 'הוקי', 'גולף', 'קריקט',
    'רוגבי', 'כדורעף', 'איגרוף', 'היאבקות', 'מרתון', 'אולימפיאדה', 'אולימפי',
    'אתלט', 'אתלטיקה', 'אליפות', 'ליגה', 'ליגת', 'משחק', 'תוצאה', 'קבוצה', 'קבוצת',
    'שחקן', 'שחקנית', 'מאמן', 'אצטדיון', 'כדור', 'גביע', 'שער', 'גול',
    'מכבי', 'הפועל', 'בית"ר', 'ביתר', 'מונדיאל', 'יורו', 'צ\'מפיונס',
    'פלייאוף', 'גמר', 'חצי גמר', 'רבע גמר', 'נבחרת', 'פרמייר ליג',
    'לה ליגה', 'סרייה א', 'בונדסליגה', 'ליגת האלופות', 'ליגה לאומית',
  ],
  sv: [
    'sport', 'idrott', 'fotboll', 'basket', 'tennis', 'baseball', 'hockey', 'ishockey',
    'golf', 'cricket', 'rugby', 'volleyboll', 'boxning', 'brottning', 'maraton',
    'olympiska', 'olympiad', 'atlet', 'mästerskap', 'liga', 'allsvenskan',
    'match', 'poäng', 'lag', 'spelare', 'tränare', 'stadion', 'arena', 'boll', 'pokal', 'mål',
    'vm', 'em', 'sm', 'slutspel', 'final', 'semifinal', 'kvartsfinal',
    'djurgården', 'aik', 'malmö ff', 'hammarby', 'ifk göteborg',
  ],
  ja: [
    'スポーツ', 'サッカー', 'フットボール', 'バスケ', 'バスケットボール', 'テニス',
    '野球', 'ホッケー', 'ゴルフ', 'クリケット', 'ラグビー', 'バレー', 'バレーボール',
    'ボクシング', 'レスリング', 'マラソン', 'オリンピック', '五輪', 'アスリート',
    '選手権', 'リーグ', 'Jリーグ', '試合', 'スコア', 'チーム', '選手', 'コーチ',
    'スタジアム', 'ボール', 'カップ', 'ゴール', 'ワールドカップ', 'W杯',
    'プレーオフ', '決勝', '準決勝', '準々決勝', 'MLB', 'NBA', 'NFL',
    '甲子園', '大相撲', '相撲', '柔道', '剣道', '空手',
  ],
  es: [
    'deporte', 'deportes', 'fútbol', 'futbol', 'baloncesto', 'tenis', 'béisbol', 'beisbol',
    'hockey', 'golf', 'críquet', 'rugby', 'voleibol', 'boxeo', 'lucha', 'maratón',
    'olímpicos', 'olimpiadas', 'atleta', 'campeonato', 'liga', 'laliga', 'la liga',
    'partido', 'puntuación', 'equipo', 'jugador', 'jugadora', 'entrenador', 'estadio',
    'balón', 'pelota', 'copa', 'gol', 'mundial', 'champions', 'uefa',
    'playoffs', 'final', 'semifinal', 'cuartos de final',
    'real madrid', 'barcelona', 'atlético', 'atletico', 'sevilla',
  ],
};

/**
 * Common brand names and proper nouns to filter out (case-insensitive)
 */
export const BANNED_BRAND_WORDS = new Set([
  'APPLE', 'GOOGLE', 'AMAZON', 'NETFLIX', 'TESLA', 'NIKE', 'ADIDAS',
  'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER', 'YOUTUBE', 'SPOTIFY',
  'MICROSOFT', 'SAMSUNG', 'SONY', 'NINTENDO', 'PLAYSTATION', 'XBOX',
  'IPHONE', 'IPAD', 'MACBOOK', 'ANDROID', 'WINDOWS',
  'ISROTEL', 'HILTON', 'MARRIOTT', 'AIRBNB',
  'MCDONALDS', 'STARBUCKS', 'COCA', 'COLA', 'PEPSI',
  'DISNEY', 'MARVEL', 'PIXAR', 'WARNER', 'HBO', 'CNN', 'BBC',
  'BITCOIN', 'ETHEREUM', 'CRYPTO',
]);

/**
 * NSFW keywords to filter out from trends
 */
export const BANNED_KEYWORDS = [
  'porn',
  'xxx',
  'sex',
  'nude',
  'nsfw',
  'death',
  'kill',
  'murder',
  'suicide',
  'violence',
  'terrorist',
  'war crime',
];

/**
 * Political keywords to filter out from trends (not child-friendly topics)
 * Multi-language support for political content detection
 */
export const POLITICAL_KEYWORDS_BY_LANGUAGE: Record<string, string[]> = {
  en: [
    // Elections & Voting
    'election', 'elections', 'vote', 'voting', 'ballot', 'campaign', 'candidate',
    'primary', 'caucus', 'electoral', 'polling', 'runoff', 'recount',
    // Political parties & ideologies
    'republican', 'democrat', 'liberal', 'conservative', 'libertarian', 'socialist',
    'communist', 'fascist', 'marxist', 'progressive', 'nationalist', 'populist',
    'gop', 'dnc', 'rnc', 'maga', 'woke', 'antifa',
    // Government bodies
    'congress', 'senate', 'parliament', 'legislature', 'supreme court', 'cabinet',
    'white house', 'capitol', 'ministry', 'lawmaker', 'senator', 'representative',
    // Political figures (general terms)
    'president', 'prime minister', 'politician', 'politics', 'political',
    'governor', 'mayor', 'dictator', 'regime', 'administration',
    // Current political figures
    'trump', 'biden', 'obama', 'clinton', 'desantis', 'pence', 'pelosi',
    'netanyahu', 'putin', 'zelensky', 'xi jinping', 'kim jong',
    // Controversies & conflicts
    'impeach', 'scandal', 'corruption', 'protest', 'rally', 'riot', 'uprising',
    'insurrection', 'coup', 'martial law', 'curfew', 'lockdown',
    // Sensitive policy topics
    'abortion', 'pro-life', 'pro-choice', 'roe v wade',
    'gun control', 'second amendment', 'firearms', 'nra',
    'immigration', 'border', 'refugee', 'asylum', 'deportation', 'migrant',
    'climate change', 'global warming', // when used politically
    // Political spectrum
    'left wing', 'right wing', 'extremist', 'radical', 'activist', 'partisan',
    'bipartisan', 'moderate', 'centrist',
    // War & Military
    'war', 'military', 'army', 'weapon', 'missile', 'bomb', 'attack', 'invasion',
    'sanctions', 'treaty', 'diplomacy', 'nato', 'un ', 'ceasefire', 'airstrike',
    'troops', 'deployment', 'occupation', 'siege', 'blockade',
    // Terrorism
    'terrorist', 'terrorism', 'hamas', 'hezbollah', 'isis', 'al qaeda', 'taliban',
    // Sensitive regions
    'gaza', 'west bank', 'ukraine', 'crimea', 'taiwan strait',
  ],
  he: [
    // בחירות והצבעה
    'בחירות', 'הצבעה', 'קלפי', 'קמפיין', 'מועמד', 'מפלגה', 'קואליציה', 'אופוזיציה',
    // מפלגות
    'ליכוד', 'עבודה', 'ימין', 'שמאל', 'מרכז', 'חרדי', 'דתי', 'חילוני',
    'יש עתיד', 'כחול לבן', 'הציונות הדתית', 'עוצמה יהודית',
    // גופי ממשל
    'כנסת', 'ממשלה', 'בית המשפט העליון', 'בג"ץ', 'משרד',
    // דמויות פוליטיות
    'ראש ממשלה', 'נתניהו', 'ביבי', 'לפיד', 'גנץ', 'בן גביר', 'סמוטריץ',
    'פוליטיקה', 'פוליטי', 'פוליטיקאי',
    // מחאות ושחיתות
    'הפגנה', 'מחאה', 'שחיתות', 'פרשה', 'הדחה', 'כתב אישום',
    // מלחמה וצבא
    'מלחמה', 'צבא', 'צה"ל', 'טיל', 'פצצה', 'התקפה', 'פלישה', 'מבצע',
    'גיוס', 'מילואים', 'הפצצה', 'תקיפה',
    // טרור וסכסוך
    'פלסטין', 'עזה', 'חמאס', 'חיזבאללה', 'טרור', 'פיגוע', 'חטיפה',
    'יהודה ושומרון', 'התנחלות', 'גדר ההפרדה',
    // נושאים רגישים
    'רפורמה משפטית', 'דמוקרטיה', 'דיקטטורה',
  ],
  sv: [
    // Val och röstning
    'val', 'rösta', 'röstning', 'kampanj', 'kandidat', 'parti', 'koalition',
    // Partier
    'riksdag', 'regering', 'statsminister', 'politiker', 'politik', 'politisk',
    'socialdemokrat', 'moderat', 'sverigedemokrat', 'vänsterparti', 'miljöparti',
    'vänster', 'höger', 'center',
    // Protester
    'protest', 'demonstration', 'korruption', 'skandal', 'uppror',
    // Krig och militär
    'krig', 'militär', 'armé', 'vapen', 'missil', 'bomb', 'attack', 'invasion',
    'trupper', 'ockupation',
    // Känsliga ämnen
    'invandring', 'flykting', 'gräns', 'asyl', 'deportation',
  ],
  ja: [
    // 選挙
    '選挙', '投票', 'キャンペーン', '候補者', '政党', '連立',
    // 政府
    '国会', '政府', '首相', '総理', '政治家', '政治', '政治的',
    '内閣', '与党', '野党', '議員',
    // 政党
    '自民党', '民主党', '共産党', '公明党',
    '左翼', '右翼', '保守', 'リベラル',
    // 抗議
    'デモ', '抗議', '汚職', 'スキャンダル', '暴動',
    // 戦争
    '戦争', '軍', '軍事', '武器', 'ミサイル', '爆弾', '攻撃', '侵攻',
    '自衛隊', '徴兵', '空爆',
    // テロ
    'テロ', 'テロリスト', '過激派',
  ],
  es: [
    // Elecciones
    'elección', 'elecciones', 'votar', 'votación', 'campaña', 'candidato',
    'primarias', 'coalición', 'oposición',
    // Gobierno
    'congreso', 'parlamento', 'gobierno', 'presidente', 'político', 'política',
    'senado', 'ministro', 'legislador', 'gobernador',
    // Ideologías
    'izquierda', 'derecha', 'liberal', 'conservador', 'socialista', 'comunista',
    'populista', 'nacionalista',
    // Protestas
    'protesta', 'manifestación', 'corrupción', 'escándalo', 'golpe de estado',
    'disturbios', 'revuelta',
    // Guerra
    'guerra', 'militar', 'ejército', 'arma', 'misil', 'bomba', 'ataque', 'invasión',
    'tropas', 'ocupación', 'bombardeo',
    // Temas sensibles
    'inmigración', 'refugiado', 'frontera', 'deportación', 'asilo',
    'aborto', 'control de armas',
    // Terrorismo
    'terrorista', 'terrorismo', 'extremista',
  ],
};

/**
 * Timeout for AI content moderation (shorter than challenge generation)
 */
export const AI_CONTENT_MODERATION_TIMEOUT_MS = 15_000; // 15 seconds

/**
 * Content moderation categories for AI filtering
 */
export const CONTENT_MODERATION_CATEGORIES = {
  CHILD_INAPPROPRIATE: 'child_inappropriate',
  POLITICAL: 'political',
  VIOLENT: 'violent',
  ADULT: 'adult',
  CONTROVERSIAL: 'controversial',
} as const;

/**
 * Stop words by language for filtering keyword extraction
 */
export const STOP_WORDS_BY_LANGUAGE: Record<string, string[]> = {
  en: ['the', 'and', 'for', 'that', 'with', 'from', 'this', 'are', 'was', 'been', 'has', 'have', 'about', 'what', 'when', 'where', 'news', 'update', 'latest', 'breaking', 'new', 'first', 'last', 'just', 'now', 'today', 'here', 'there', 'says', 'said', 'after', 'before', 'will', 'how', 'why', 'who', 'more', 'most', 'some', 'other'],
  he: ['של', 'על', 'את', 'עם', 'זה', 'היא', 'הוא', 'אני', 'לא', 'כי', 'גם', 'אם', 'או', 'יש', 'היום', 'חדשות', 'אחרי', 'לפני', 'עכשיו', 'כאן', 'שם', 'אומר', 'אמר', 'יותר', 'הכי', 'כמה', 'אחר', 'עוד'],
  sv: ['och', 'det', 'att', 'för', 'med', 'som', 'den', 'har', 'var', 'inte', 'efter', 'före', 'här', 'där', 'säger', 'mer', 'mest', 'annan'],
  ja: ['の', 'は', 'が', 'を', 'に', 'で', 'と', 'も', 'か', 'です', 'ます', 'した', 'する', 'ある', 'いる', 'これ', 'それ', 'あれ'],
  es: ['que', 'para', 'con', 'del', 'las', 'los', 'una', 'por', 'más', 'como', 'pero', 'este', 'esta', 'sobre', 'todo', 'también', 'desde', 'entre', 'hasta', 'según', 'dice', 'nuevo', 'nueva'],
};
