/**
 * Daily Challenge Word Lists
 *
 * Curated word lists for target words and bonus words
 */

import type { Language } from '@/types';
import enHuntTargets from '@/lib/practice/data/wordHuntTargets.en.json';
import heHuntTargets from '@/lib/practice/data/wordHuntTargets.he.json';
import svHuntTargets from '@/lib/practice/data/wordHuntTargets.sv.json';
import esHuntTargets from '@/lib/practice/data/wordHuntTargets.es.json';
import ruHuntTargets from '@/lib/practice/data/wordHuntTargets.ru.json';

/**
 * Bonus words to embed in the grid for survival mode playability
 * These are 4+ letter words that can be discovered for life/tokens
 * Curated for each language to ensure validity
 */
export const BONUS_WORD_LISTS: Record<Language, string[]> = {
  en: [
    // Common 4-letter English words for discovery
    'TREE', 'BIRD', 'FISH', 'STAR', 'MOON', 'RAIN', 'WIND', 'SNOW',
    'BOOK', 'DOOR', 'HAND', 'FOOT', 'HEAD', 'FACE', 'ROCK', 'SAND',
    'BOAT', 'GAME', 'WOLF', 'BEAR', 'FROG', 'DEER', 'DUCK', 'HAWK',
    'CAKE', 'MILK', 'SOUP', 'RICE', 'BEAN', 'CORN', 'PLUM', 'PEAR',
    'GOLD', 'IRON', 'JADE', 'RUBY', 'SILK', 'WOOL', 'CLAY', 'COAL',
    'HILL', 'LAKE', 'WAVE', 'CAVE', 'PATH', 'PEAK', 'POND', 'REEF',
  ],
  he: [
    // Common 4+ letter Hebrew words
    'בית', 'מים', 'עולם', 'אדם', 'דבר', 'עין', 'ראש', 'ילד',
    'ספר', 'חבר', 'דלת', 'חלון', 'שמש', 'ירח', 'כוכב', 'פרח',
    'סוס', 'כלב', 'ציפור', 'דגים', 'ארנב', 'נמר', 'זאב', 'דוב',
  ],
  sv: [
    // Common 4+ letter Swedish words
    'HUND', 'KATT', 'FÅGEL', 'TRÄD', 'STEN', 'BERG', 'SJÖN', 'REGN',
    'SNÖN', 'VIND', 'SOLEN', 'MÅNE', 'NATT', 'LJUS', 'MÖRK', 'VÄGG',
    'GOLV', 'DÖRR', 'BORD', 'STOL', 'SÄNG', 'LAMP', 'GLAS', 'SKÅL',
  ],
  ja: [
    // Common 2-character Japanese words/kanji compounds (Japanese uses different char lengths)
    '日本', '東京', '学校', '先生', '学生', '友達', '家族', '会社',
    '仕事', '時間', '天気', '音楽', '映画', '料理', '旅行', '電車',
  ],
  es: [
    // Common 4+ letter Spanish words
    'CASA', 'AGUA', 'VIDA', 'AMOR', 'MESA', 'LIBRO', 'PERRO', 'GATO',
    'LUNA', 'CIELO', 'NOCHE', 'TIERRA', 'PLAYA', 'CAMPO', 'MONTE', 'LAGO',
    'FLOR', 'ROSA', 'ARBOL', 'HOJA', 'VINO', 'CAFE', 'LECHE', 'CARNE',
  ],
  fr: [
    // Common 4+ letter French words
    'MAISON', 'LIVRE', 'CHIEN', 'CHAT', 'LUNE', 'SOLEIL', 'NUIT', 'JOUR',
    'FLEUR', 'ARBRE', 'TERRE', 'CIEL', 'PLAGE', 'VILLE', 'PAYS', 'MONDE',
    'PAIN', 'LAIT', 'CAFE', 'VINO', 'ROSE', 'BLEU', 'NOIR', 'BLANC',
  ],
  de: [
    // Common 4+ letter German words
    'HAUS', 'BAUM', 'BUCH', 'HUND', 'KATZE', 'SONNE', 'MOND', 'STERN',
    'BERG', 'WALD', 'FLUSS', 'MEER', 'STADT', 'LAND', 'WELT', 'ZEIT',
    'BROT', 'WEIN', 'MILCH', 'ROSE', 'BLAU', 'GRÜN', 'ROTE', 'GOLD',
  ],
  ru: [
    // Common 4+ letter Russian words for discovery
    'ДЕРЕВО', 'ПТИЦА', 'РЫБА', 'ЗВЕЗДА', 'ЛУНА', 'ДОЖДЬ', 'ВЕТЕР', 'СНЕГ',
    'КНИГА', 'ДВЕРЬ', 'РУКА', 'НОГА', 'ГОЛОВА', 'ЛИЦО', 'КАМЕНЬ', 'ПЕСОК',
    'ЛОДКА', 'ИГРА', 'ВОЛК', 'МЕДВЕДЬ', 'ЛЯГУШКА', 'ОЛЕНЬ', 'УТКА', 'ЯСТРЕБ',
    'ТОРТ', 'МОЛОКО', 'СУП', 'РЫБА', 'ХЛЕБ', 'КУКУРУЗА', 'СЛИВА', 'ГРУША',
    'ЗОЛОТО', 'ЖЕЛЕЗО', 'НЕФРИТ', 'РУБИН', 'ШЕЛК', 'ШЕРСТЬ', 'ГЛИНА', 'УГОЛЬ',
    'ХОЛМ', 'ОЗЕРО', 'ВОЛНА', 'ПЕЩЕРА', 'ТРОПА', 'ВЕРШИНА', 'ПРУД', 'РИФ',
  ],
};

/**
 * Curated lists of quality target words for Word Hunt mode.
 *
 * WORD SELECTION CRITERIA (all words must score well on):
 * 1. Imageability — player can instantly picture it
 * 2. Discovery satisfaction — finding it feels like a small victory
 * 3. Age-range familiarity — known to ages 10+
 * 4. Cultural safety — appropriate across all cultures
 * 5. Theme resonance — fits a vivid category (animals, nature, fantasy, etc.)
 *
 * BLACKLISTED categories: jargon (admin, usage), medical distress (acne),
 * violence-primary (abuse), purely functional (about, also, their).
 * See wordQuality.ts for the full blacklist.
 */
const CURATED_TARGET_WORD_LISTS: Record<Language, string[]> = {
  en: [
    // Window: 5-6 letters only (MIN_ANSWER_LENGTH=5, MAX_TARGET_WORD_LENGTH=6).
    // ── Animals & Creatures ──
    'OTTER', 'RAVEN', 'CRANE', 'BISON', 'SHARK', 'WHALE', 'EAGLE',
    'TIGER', 'HORSE', 'SNAKE',
    // ── Nature & Landscape ──
    'CLOUD', 'RIVER', 'OCEAN', 'BEACH',
    // ── Food & Flavor ──
    'PEACH', 'GRAPE', 'LEMON', 'BREAD', 'OLIVE', 'CREAM',
    'FEAST', 'SPICE', 'MANGO', 'COCOA',
    // ── Magic & Fantasy ──
    'FLAME', 'SPARK', 'CHARM', 'SPELL', 'GHOST', 'FAIRY', 'QUEST',
    'REALM', 'CURSE', 'FORGE', 'DRAGON', 'KNIGHT', 'WIZARD', 'PIRATE',
    'CASTLE',
    // ── Colors & Materials ──
    'PEARL', 'CORAL', 'AMBER', 'IVORY', 'SILVER', 'BRONZE',
    // ── Actions & Movement ──
    'DANCE', 'BLOOM', 'BLAZE', 'SURGE', 'SWOOP', 'GLIDE', 'SWIFT', 'BRAVE',
    // ── Emotions & Character ──
    'DREAM', 'PRIDE', 'HEART', 'PEACE', 'NOBLE', 'GRACE', 'GRAND',
    // ── Objects & Tools ──
    'CROWN', 'SWORD', 'TORCH', 'SHELL',
    // ── Places & Structures ──
    'TOWER', 'GROVE', 'TRAIL', 'SHORE', 'CLIFF', 'ARENA', 'GARDEN',
    'FOREST', 'ISLAND', 'VALLEY',
    // ── Weather & Sky ──
    'FROST', 'STORM', 'SHADE', 'SUNSET', 'BREEZE', 'MEADOW', 'STREAM',
    // ── Extra vivid words ──
    'SCOUT', 'MEDAL',
  ],
  he: [
    // Window: 5-6 letters only. AI-augmented 2026-05-05 — flag for native review.
    // ── People & Story ──
    'ציפור', 'סיפור', 'גיבור', 'תלמיד', 'ילדים', 'חברים', 'משפחה',
    // ── Home & Objects ──
    'שולחן', 'מנורה', 'מחברת', 'עפרון', 'עיתון', 'מילון', 'מברשת',
    'שמיכה', 'בקבוק', 'חולצה', 'נעליים', 'מטריה', 'מצלמה',
    // ── Places & Structures ──
    'ארמון', 'מעלית', 'מסעדה', 'בריכה', 'אמבטיה', 'מקלחת', 'ספרייה',
    'מדינה', 'עיירה',
    // ── Vehicles ──
    'אוניה', 'מכונית', 'אופנוע', 'מכונה',
    // ── Food & Treats ──
    'גלידה', 'שוקולד', 'עוגיה', 'תפריט', 'ארוחה',
    // ── Activities & Events ──
    'ריקוד', 'שחייה', 'שיעור', 'הפסקה', 'חופשה', 'מסיבה',
    'חתונה', 'הרפתקה',
    // ── Music & Sport ──
    'פסנתר', 'מוזיקה', 'כדורגל', 'כדורסל',
    // ── Health & Materials ──
    'בריאות', 'נחושת', 'טלפון',
  ],
  sv: [
    // Window: 5-6 letters only.
    // ── Swedish 5-letter ──
    'FÅGEL', 'SOLEN', 'KRAFT', 'PLATS', 'DRAKE', 'SVÄRD', 'SLOTT',
    'NATUR', 'BJÖRN', 'FRUKT', 'FROST', 'HIMMEL', 'STRAND',
    'BÄVER', 'HJÄLM', 'STRID', 'MÅNEN', 'RUNDA', 'VATTEN', 'VÄRLD',
    'VALEN',
    // ── Swedish 6-letter ──
    'MORGON', 'KVÄLL', 'VINTER', 'SOMMAR', 'SKOGEN', 'FJÄRIL',
    'KANIN', 'GNISTA', 'HONUNG', 'SILVER', 'BLOMMA', 'SJÖMAN',
  ],
  ja: [
    // ── Japanese 2-character (common compounds) ──
    '日本', '東京', '学校', '先生', '学生', '友達', '家族', '会社',
    '仕事', '時間', '天気', '音楽', '映画', '料理', '旅行', '電車',
    '新聞', '大学', '病院', '空港', '公園', '銀行', '地図', '切符',
    '動物', '花火', '海岸', '山道', '夕日', '朝日', '温泉', '祭り',
    '太鼓', '忍者', '武士', '宝石', '冒険', '勇気', '平和', '自然',
    // ── Japanese 3-character ──
    '日本語', '図書館', '郵便局', '美術館', '動物園', '水族館', '遊園地',
    '新幹線', '富士山', '花見', '七夕', '風鈴', '折紙', '将棋',
    '柔道', '空手', '弓道', '剣道', '紅葉',
    // ── Japanese 4-character ──
    'お正月', 'お花見', '運動会', '文化祭', '北海道',
    '沖縄県', '東京都', '大阪府', '京都府', '回転寿司',
    '味噌汁', 'お弁当', '花吹雪', '満開桜', '修学旅行',
  ],
  es: [
    // Window: 5-6 letters only.
    // ── Spanish 5-letter ──
    'LIBRO', 'MUNDO', 'NOCHE', 'PLAYA', 'CAMPO', 'MONTE', 'LECHE', 'AMIGO',
    'CIELO', 'ARBOL', 'TIGRE', 'PERRO', 'FUEGO', 'HIELO', 'NIEVE',
    'BARCO', 'TORRE', 'REINA', 'BRUJA', 'MAGIA', 'PIEDRA', 'ARENA',
    'SELVA', 'BOSQUE', 'CUEVA', 'GLOBO', 'DANZA', 'CANTO', 'FRESA',
    'LIMON', 'MANGO', 'ABEJA', 'CORAL', 'CONCHA', 'ESPADA',
    'VIENTO', 'CABRA', 'TIERRA',
    // ── Spanish 6-letter ──
    'FIESTA', 'COCINA', 'JARDIN', 'TIEMPO', 'PLANTA',
    'DRAGON', 'PIRATA', 'TESORO', 'CORONA', 'ESCUDO', 'CAMINO',
    'VOLCAN', 'OCEANO', 'DELFIN', 'CONEJO',
    'HALCON', 'MADERA', 'CUERDA', 'MUSICA', 'FUENTE', 'MOLINO',
    'REGALO',
  ],
  fr: [
    // French 4-letter words
    'CHAT', 'PAIN', 'LUNE', 'JOUR', 'NUIT', 'ROSE', 'BLEU', 'NOIR',
    'VENT', 'BEAU', 'DOUX', 'LOUP', 'CERF', 'PORC',
    // French 5-letter words
    'ARBRE', 'FLEUR', 'MONDE', 'TEMPS', 'VILLE', 'GRAND', 'PETIT',
    'BELLE', 'FORCE', 'PLACE', 'CHOSE', 'LIVRE', 'CHIEN', 'AMOUR',
    'JOLIE', 'RÊVE', 'ÉTOILE', 'NEIGE', 'NUAGE', 'HERBE',
    // French 6-letter words
    'MAISON', 'JARDIN', 'SOLEIL', 'NATURE', 'FORÊT',
    'DRAGON', 'TRÉSOR', 'PLAGE', 'OCÉAN',
  ],
  de: [
    // German 4-letter words
    'HAUS', 'BAUM', 'BUCH', 'HUND', 'MOND', 'BERG', 'WALD', 'MEER',
    'LAND', 'WELT', 'ZEIT', 'BROT', 'WEIN', 'ROSE', 'BLAU', 'GOLD',
    'WOLF', 'BIER', 'BURG', 'TURM',
    // German 5-letter words
    'KATZE', 'SONNE', 'STERN', 'STADT', 'KRAFT', 'PLATZ', 'LIEBE',
    'WASSER', 'FLUSS', 'ADLER', 'PFERD', 'FEUER', 'TRAUM', 'STURM',
    // German 6-letter words
    'GARTEN', 'NATUR', 'HIMMEL', 'SOMMER', 'WINTER',
    'HERBST', 'SCHULE', 'KIRCHE', 'BRÜCKE', 'DRACHE', 'RITTER',
  ],
  ru: [
    // Window: 5-6 letters only (MIN_ANSWER_LENGTH=5, MAX_TARGET_WORD_LENGTH=6).
    // ── Животные и существа ──
    'ВЫДРА', 'ВОРОН', 'ЖУРАВЛЬ', 'БИЗОН', 'АКУЛА', 'КИТ', 'ОРЁЛ',
    'ТИГР', 'КОНЬ', 'ЗМЕЯ',
    // ── Природа и пейзаж ──
    'ОБЛАКО', 'РЕКА', 'ОКЕАН', 'ПЛЯЖ',
    // ── Еда и вкус ──
    'ПЕРСИК', 'ВИНОГРАД', 'ЛИМОН', 'ХЛЕБ', 'МАСЛИНА', 'СЛИВКИ',
    'ПИРШЕСТВО', 'СПЕЦИЯ', 'МАНГО', 'КАКАО',
    // ── Магия и фантазия ──
    'ПЛАМЯ', 'ИСКРА', 'ЧАРА', 'ЗАКЛЯТИЕ', 'ПРИЗРАК', 'ФЕЯ', 'МЕЧТА',
    'КОРОЛЕВСТВО', 'ПРОКЛЯТИЕ', 'КУЗНИЦА', 'ДРАКОН', 'РЫЦАРЬ', 'ВОЛШЕБНИК', 'ПИРАТ',
    'ЗАМОК',
    // ── Цвета и материалы ──
    'ЖЕМЧУГ', 'КОРАЛЛ', 'ЯНТАРЬ', 'СЛОНОВАЯ', 'СЕРЕБРО', 'БРОНЗА',
    // ── Действия и движение ──
    'ТАНЕЦ', 'ЦВЕТЕНИЕ', 'ПЛАМЯ', 'ВОЛНА', 'СТРЕМЛЕНИЕ', 'СКОЛЬЖЕНИЕ', 'БЫСТРО', 'МУЖЕСТВО',
    // ── Эмоции и характер ──
    'СНОВИДЕНИЕ', 'ГОРДОСТЬ', 'СЕРДЦЕ', 'МИР', 'БЛАГОРОДСТВО', 'ГРАЦИЯ', 'ВЕЛИЧИЕ',
    // ── Объекты и инструменты ──
    'КОРОНА', 'МЕЧ', 'ФАКЕЛ', 'РАКОВИНА',
    // ── Места и структуры ──
    'БАШНЯ', 'РОЩА', 'ТРОПА', 'БЕРЕГ', 'УТЁС', 'АРЕНА', 'САД',
    'ЛЕС', 'ОСТРОВ', 'ДОЛИНА',
    // ── Погода и небо ──
    'МОРОЗ', 'БУРЯ', 'ТЕНЬ', 'ЗАКАТ', 'ВЕТЕРОК', 'ЛУГА', 'РУЧЕЙ',
    // ── Дополнительные яркие слова ──
    'РАЗВЕДЧИК', 'МЕДАЛЬ',
  ],
};

/**
 * Daily target pools = the curated lists above + the validated 5-7 letter Word
 * Hunt pools (lib/practice/data/wordHuntTargets.*). This unifies the target
 * source across daily, practice, and MP onto one large, dictionary-validated,
 * fun-to-reveal set — which kills the small-pool target repetition ("recurring")
 * and the obscure-dictionary-noun problem. Curated words stay first (dedup keeps
 * the earlier occurrence). en/sv/es pools are uppercase, he is base-form; both
 * match the existing list conventions. JA keeps its curated list (no pool).
 */
function mergeUnique(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const w of list) {
      const k = w.toUpperCase();
      if (!seen.has(k)) { seen.add(k); out.push(w); }
    }
  }
  return out;
}

export const TARGET_WORD_LISTS: Record<Language, string[]> = {
  ...CURATED_TARGET_WORD_LISTS,
  en: mergeUnique(CURATED_TARGET_WORD_LISTS.en, enHuntTargets as string[]),
  he: mergeUnique(CURATED_TARGET_WORD_LISTS.he, heHuntTargets as string[]),
  sv: mergeUnique(CURATED_TARGET_WORD_LISTS.sv, svHuntTargets as string[]),
  es: mergeUnique(CURATED_TARGET_WORD_LISTS.es, esHuntTargets as string[]),
  ru: mergeUnique(CURATED_TARGET_WORD_LISTS.ru, ruHuntTargets as string[]),
};

/**
 * Same-length helper words organized by word length for each language.
 * These words are prioritized for embedding to help players practice
 * same-length guesses and get letter feedback (green/yellow clues).
 *
 * Minimum 5 same-length words should be embedded alongside the target word.
 */
export const SAME_LENGTH_HELPER_WORDS: Record<Language, Record<number, string[]>> = {
  en: {
    3: ['CAT', 'DOG', 'SUN', 'RUN', 'FUN', 'BIG', 'RED', 'SKY', 'FLY', 'CRY', 'DRY', 'TRY', 'BAT', 'RAT', 'HAT', 'MAT', 'SAT', 'FAT', 'PEN', 'TEN', 'HEN', 'MEN', 'DEN', 'BED', 'LED', 'WED', 'FED'],
    4: ['TREE', 'BIRD', 'FISH', 'STAR', 'MOON', 'RAIN', 'WIND', 'SNOW', 'BOOK', 'DOOR', 'HAND', 'FOOT', 'HEAD', 'FACE', 'ROCK', 'SAND', 'BOAT', 'GAME', 'WOLF', 'BEAR', 'FROG', 'DEER', 'DUCK', 'HAWK', 'CAKE', 'MILK', 'SOUP', 'RICE', 'BEAN', 'CORN', 'PLUM', 'PEAR', 'GOLD', 'IRON', 'JADE', 'RUBY', 'SILK', 'WOOL', 'CLAY', 'COAL', 'HILL', 'LAKE', 'WAVE', 'CAVE', 'PATH', 'PEAK', 'POND', 'REEF', 'KING', 'DUKE', 'HERO', 'SAGE', 'MONK', 'CHEF', 'MAGE', 'BARD', 'SHIP', 'CART', 'BIKE', 'SLED', 'RAFT', 'KITE', 'DOME', 'ARCH'],
    5: ['WORLD', 'HOUSE', 'WATER', 'LIGHT', 'NIGHT', 'DREAM', 'STORM', 'FLAME', 'STONE', 'CLOUD', 'RIVER', 'OCEAN', 'BEACH', 'HORSE', 'TIGER', 'EAGLE', 'SNAKE', 'WHALE', 'SHARK', 'CRANE', 'BREAD', 'GRAPE', 'LEMON', 'PEACH', 'MAPLE', 'CROWN', 'SWORD', 'SHIELD', 'TOWER', 'BRIDGE', 'PLANT', 'BLOOM', 'FRUIT', 'GRASS', 'TRAIL', 'GROVE', 'CLIFF', 'SHORE', 'DELTA', 'FROST', 'SPARK', 'BLAZE', 'GLEAM', 'SHADE', 'QUIET', 'PEACE', 'BRAVE', 'NOBLE', 'SWIFT', 'GRAND'],
    6: ['CASTLE', 'GARDEN', 'FOREST', 'ISLAND', 'DESERT', 'JUNGLE', 'VALLEY', 'MEADOW', 'STREAM', 'SUNSET', 'WINTER', 'SUMMER', 'SPRING', 'AUTUMN', 'TEMPLE', 'PALACE', 'CHURCH', 'BRIDGE', 'HARBOR', 'MARKET', 'SCHOOL', 'STABLE', 'TAVERN', 'PRISON', 'DRAGON', 'KNIGHT', 'WIZARD', 'PIRATE', 'HUNTER', 'ARCHER', 'ORANGE', 'BANANA', 'CHERRY', 'MANGO', 'SILVER', 'BRONZE', 'COPPER', 'MARBLE', 'VELVET', 'COTTON', 'CANDLE', 'MIRROR', 'BASKET', 'HAMMER', 'ANCHOR', 'RIBBON', 'FEATHER', 'BUTTON'],
    7: ['RAINBOW', 'THUNDER', 'VOLCANO', 'GLACIER', 'TORNADO', 'MONSOON', 'SUNRISE', 'MORNING', 'EVENING', 'WEATHER', 'CRYSTAL', 'DIAMOND', 'EMERALD', 'SAPPHIRE', 'KINGDOM', 'VILLAGE', 'COTTAGE', 'MANSION', 'LIBRARY', 'MUSEUM', 'CAPTAIN', 'SOLDIER', 'WARRIOR', 'GENERAL', 'EMPEROR', 'SCHOLAR', 'TEACHER', 'PAINTER', 'SCULPTOR', 'FOUNDER', 'MYSTERY', 'JOURNEY', 'DESTINY', 'VICTORY', 'FREEDOM', 'COURAGE', 'HARMONY', 'BALANCE', 'WONDER', 'MIRACLE'],
    8: ['MOUNTAIN', 'WATERFALL', 'TREASURE', 'ADVENTURE', 'CHAMPION', 'GUARDIAN', 'EXPLORER', 'INVENTOR', 'COMPOSER', 'ARCHITECT', 'STRENGTH', 'PATIENCE', 'KINDNESS', 'LAUGHTER', 'SUNSHINE', 'MOONLIGHT', 'STARLIGHT', 'TWILIGHT', 'MIDNIGHT', 'DAYBREAK'],
  },
  he: {
    2: ['יד', 'עץ', 'אב', 'אם', 'בן', 'בת', 'גן', 'דג', 'זב', 'חג', 'טל', 'כד', 'לב', 'מט', 'נר', 'סף', 'עד', 'פה', 'צל', 'קר'],
    3: ['בית', 'מים', 'אדם', 'דבר', 'עין', 'ראש', 'ילד', 'ספר', 'חבר', 'דלת', 'שמש', 'ירח', 'פרח', 'סוס', 'כלב', 'עוף', 'דגי', 'אות', 'קול', 'אור'],
    4: ['עולם', 'חלון', 'כוכב', 'ציפור', 'דגים', 'ארנב', 'נמר', 'זאב', 'דוב', 'אריה', 'עוגה', 'לחם', 'חלב', 'מרק', 'זהב', 'כסף', 'ברזל', 'נהר', 'אגם', 'גבעה', 'שיר', 'מכתב', 'סיפור', 'חלום', 'מלך', 'גיבור', 'חכם', 'אמן', 'רופא', 'רוח', 'אדמה', 'שמים', 'לילה', 'יום', 'בוקר'],
    5: ['נחושת', 'שולחן', 'מחשב', 'טלפון', 'חיוך', 'משפחה', 'חברים', 'אהבה', 'שמחה', 'בריאות'],
  },
  sv: {
    3: ['HUS', 'DAG', 'ÖGA', 'ÖRA', 'ARM', 'BEN', 'BOK', 'BIL', 'SOL', 'VÄG', 'BRO', 'SJÖ', 'SKY', 'SNÖ', 'TRÄ', 'ÖL', 'ÄGG', 'ÄRT', 'ÖST'],
    4: ['HUND', 'KATT', 'STEN', 'BERG', 'REGN', 'SNÖN', 'VIND', 'NATT', 'LJUS', 'MÖRK', 'VÄGG', 'GOLV', 'DÖRR', 'BORD', 'STOL', 'SÄNG', 'LAMP', 'GLAS', 'SKÅL', 'BOLL', 'BÅGE', 'BÅLE', 'FISK', 'MASK', 'BLAD'],
    5: ['FÅGEL', 'TRÄD', 'SOLEN', 'MÅNE', 'VATTEN', 'VÄRLD', 'PLATS', 'LJUD', 'KRAFT', 'BÄSTA', 'FÖRSTA', 'SISTA', 'RUNDA', 'KLAR', 'BLOM', 'HIMMEL', 'VINTER', 'SOMMAR'],
    6: ['SLOTT', 'NATUR', 'MORGON', 'KVÄLL', 'FÖNSTER', 'MARKNAD', 'TRÄDGÅRD'],
  },
  ja: {
    2: ['日本', '東京', '学校', '先生', '学生', '友達', '家族', '会社', '仕事', '時間', '天気', '音楽', '映画', '料理', '旅行', '電車', '新聞', '本', '犬', '猫', '花', '木', '山', '川', '海', '空', '雨', '雪', '風', '雲'],
    3: ['日本語', '図書館', '大学', '病院', '空港', '公園', '駅', '銀行', '郵便局', '美術館', '電話', '新幹線', '桜', '富士山'],
  },
  es: {
    3: ['SOL', 'MAR', 'PAN', 'SAL', 'LUZ', 'VOZ', 'PAZ', 'REY', 'LEY', 'RÍO', 'DÍA', 'MES', 'AÑO', 'VER', 'DAR', 'SER', 'OJO', 'PIE', 'MÁS', 'DOS'],
    4: ['CASA', 'AGUA', 'VIDA', 'AMOR', 'MESA', 'LUNA', 'FLOR', 'ROSA', 'VINO', 'CAFE', 'LAGO', 'PATO', 'GATO', 'PERRO', 'PERA', 'MANO', 'PELO', 'CARA', 'BOCA', 'OJOS'],
    5: ['LIBRO', 'MUNDO', 'LUGAR', 'GENTE', 'NOCHE', 'PLAYA', 'CAMPO', 'MONTE', 'LECHE', 'CARNE', 'AMIGO', 'CIELO', 'TIERRA', 'ARBOL', 'HOJA'],
    6: ['FIESTA', 'JARDÍN', 'PUENTE', 'SIMPLE', 'COCINA', 'MAÑANA', 'TIEMPO', 'PLANTA', 'MERCADO', 'VENTANA', 'MODERNO', 'DORADO', 'CASTILLO'],
    7: ['NATURAL', 'PERFECTO', 'HERMOSO', 'PEQUEÑO', 'GRANDE', 'FANTÁSTICO'],
  },
  fr: {
    4: ['CHAT', 'PAIN', 'LUNE', 'JOUR', 'NUIT', 'ROSE', 'BLEU', 'NOIR', 'VENT', 'PLUIE', 'NEIGE', 'FROID', 'CHAUD', 'BEAU', 'DOUX'],
    5: ['ARBRE', 'FLEUR', 'MONDE', 'TEMPS', 'VILLE', 'GRAND', 'PETIT', 'BELLE', 'FORCE', 'PLACE', 'CHOSE', 'LIVRE', 'CHIEN', 'AMOUR', 'JOLIE', 'RÊVE', 'ÉTOILE'],
    6: ['MAISON', 'JARDIN', 'SOLEIL', 'NATURE', 'RIVIÈRE', 'FORÊT', 'CHÂTEAU', 'MONTAGNE'],
  },
  de: {
    4: ['HAUS', 'BAUM', 'BUCH', 'HUND', 'MOND', 'BERG', 'WALD', 'MEER', 'LAND', 'WELT', 'ZEIT', 'BROT', 'WEIN', 'ROSE', 'BLAU', 'GOLD', 'ROTE'],
    5: ['KATZE', 'SONNE', 'STERN', 'STADT', 'GROSS', 'KLEIN', 'KRAFT', 'PLATZ', 'SACHE', 'LIEBE', 'WASSER', 'FLUSS'],
    6: ['GARTEN', 'FENSTER', 'NATUR', 'HIMMEL', 'SOMMER', 'WINTER', 'HERBST', 'SCHULE', 'KIRCHE', 'BRÜCKE'],
  },
  ru: {
    4: ['ДОМА', 'ДЕРЕВО', 'КНИГА', 'СОБАКА', 'ЛУНА', 'ГОРА', 'ЛЕС', 'МОРЕ', 'ЗЕМЛЯ', 'МИРА', 'ВРЕМЯ', 'ХЛЕБ', 'ВИНО', 'РОЗА', 'СИНИЙ', 'ЗОЛОТОЙ', 'КРАСНЫЙ'],
    5: ['КОШКА', 'СОЛНЦЕ', 'ЗВЕЗДА', 'ГОРОД', 'БОЛЬШОЙ', 'МАЛЫЙ', 'СИЛА', 'МЕСТО', 'ВЕЩЬ', 'ЛЮБОВЬ', 'ВОДА', 'РЕКА'],
    6: ['САД', 'ОКНО', 'ПРИРОДА', 'НЕБО', 'ЛЕТО', 'ЗИМА', 'ОСЕНЬ', 'ШКОЛА', 'ЦЕРКОВЬ', 'МОСТ'],
  },
};

/**
 * Calculate letter overlap score between a word and target word
 * Counts how many letters from the word exist in the target (yellow-style matching)
 * Higher score = more letters in common
 */
export function calculateLetterOverlapScore(word: string, targetWord: string): number {
  const wordUpper = word.toUpperCase();
  const targetUpper = targetWord.toUpperCase();

  // Count letters in target word
  const targetLetterCounts = new Map<string, number>();
  for (const letter of targetUpper) {
    targetLetterCounts.set(letter, (targetLetterCounts.get(letter) || 0) + 1);
  }

  // Count matching letters (yellow-style: same letter, any position)
  let score = 0;
  const usedCounts = new Map<string, number>();

  for (const letter of wordUpper) {
    const available = targetLetterCounts.get(letter) || 0;
    const used = usedCounts.get(letter) || 0;
    if (used < available) {
      score++;
      usedCounts.set(letter, used + 1);
    }
  }

  return score;
}

/**
 * Get same-length helper words for a given target word
 * Combines words from SAME_LENGTH_HELPER_WORDS and TARGET_WORD_LISTS
 * Excludes the target word itself
 *
 * ENHANCED: Prioritizes words with higher letter overlap with target word
 * Words sharing more letters with target are sorted first, then shuffled within groups
 */
export function getSameLengthWords(
  targetWord: string,
  language: Language,
  random: () => number,
  extraWords: string[] = [],
): string[] {
  const targetLength = targetWord.length;
  const targetUpper = targetWord.toUpperCase();

  // Collect same-length words from helper lists
  const helperWords = SAME_LENGTH_HELPER_WORDS[language]?.[targetLength] || [];

  // Also collect same-length words from TARGET_WORD_LISTS
  const targetWords = (TARGET_WORD_LISTS[language] || [])
    .filter(w => w.length === targetLength);

  // Filter extra words (from noun lists) to same length
  const extraSameLength = extraWords.filter(w => w.length === targetLength);

  // Combine all sources and remove duplicates and the target word itself
  const allWords = [...new Set([...helperWords, ...targetWords, ...extraSameLength])]
    .map(w => w.toUpperCase())
    .filter(w => w !== targetUpper);

  // Score each word by letter overlap with target
  const scoredWords = allWords.map(word => ({
    word,
    score: calculateLetterOverlapScore(word, targetUpper)
  }));

  // Sort by score descending (more shared letters = higher priority)
  scoredWords.sort((a, b) => b.score - a.score);

  // Group words by score tier and shuffle within each tier for variety
  // This ensures high-overlap words come first but with some randomness
  const tierSize = 5; // Group every 5 words into a tier
  const result: string[] = [];

  for (let i = 0; i < scoredWords.length; i += tierSize) {
    const tier = scoredWords.slice(i, i + tierSize).map(s => s.word);
    // Shuffle within tier using seeded random
    for (let j = tier.length - 1; j > 0; j--) {
      const k = Math.floor(random() * (j + 1));
      [tier[j], tier[k]] = [tier[k], tier[j]];
    }
    result.push(...tier);
  }

  return result;
}
