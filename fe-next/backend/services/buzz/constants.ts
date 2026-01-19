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
 * Minimum answer length by language
 * Japanese kanji compounds are typically 2-4 characters
 */
export const MIN_ANSWER_LENGTH: Record<string, number> = {
  en: 3,
  he: 3,
  sv: 3,
  ja: 2,
  es: 3,
};

/**
 * Maximum answer length for all languages
 */
export const MAX_ANSWER_LENGTH = 15;

/**
 * Wordle challenge requires exactly 5-letter words
 */
export const WORDLE_WORD_LENGTH = 5;

/**
 * Vertex AI Gemini model configuration
 */
export const GEMINI_MODEL = process.env.VERTEX_AI_MODEL || 'gemini-2.5-pro';

/**
 * Thinking budget for extended reasoning (0 = disabled)
 * Max: 32768 for 2.5-pro, 24576 for 2.5-flash
 */
export const THINKING_BUDGET = parseInt(process.env.VERTEX_AI_THINKING_BUDGET || '8192', 10);

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
 * Stop words by language for filtering keyword extraction
 */
export const STOP_WORDS_BY_LANGUAGE: Record<string, string[]> = {
  en: ['the', 'and', 'for', 'that', 'with', 'from', 'this', 'are', 'was', 'been', 'has', 'have', 'about', 'what', 'when', 'where', 'news', 'update', 'latest', 'breaking', 'new', 'first', 'last', 'just', 'now', 'today', 'here', 'there', 'says', 'said', 'after', 'before', 'will', 'how', 'why', 'who', 'more', 'most', 'some', 'other'],
  he: ['של', 'על', 'את', 'עם', 'זה', 'היא', 'הוא', 'אני', 'לא', 'כי', 'גם', 'אם', 'או', 'יש', 'היום', 'חדשות', 'אחרי', 'לפני', 'עכשיו', 'כאן', 'שם', 'אומר', 'אמר', 'יותר', 'הכי', 'כמה', 'אחר', 'עוד'],
  sv: ['och', 'det', 'att', 'för', 'med', 'som', 'den', 'har', 'var', 'inte', 'efter', 'före', 'här', 'där', 'säger', 'mer', 'mest', 'annan'],
  ja: ['の', 'は', 'が', 'を', 'に', 'で', 'と', 'も', 'か', 'です', 'ます', 'した', 'する', 'ある', 'いる', 'これ', 'それ', 'あれ'],
  es: ['que', 'para', 'con', 'del', 'las', 'los', 'una', 'por', 'más', 'como', 'pero', 'este', 'esta', 'sobre', 'todo', 'también', 'desde', 'entre', 'hasta', 'según', 'dice', 'nuevo', 'nueva'],
};
