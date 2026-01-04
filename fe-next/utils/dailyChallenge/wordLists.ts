/**
 * Daily Challenge Word Lists
 *
 * Curated word lists for target words and bonus words
 */

import type { Language } from '@/types';

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
};

/**
 * Curated lists of quality target words for Word Hunt mode
 * Organized by language and difficulty
 */
export const TARGET_WORD_LISTS: Record<Language, string[]> = {
  en: [
    // 4-letter words - varied and interesting (main target pool)
    'BIRD', 'FISH', 'MOON', 'STAR', 'RAIN', 'WIND', 'SNOW', 'TREE',
    'BOOK', 'DOOR', 'HAND', 'FOOT', 'HEAD', 'FACE', 'ROCK', 'SAND',
    'BOAT', 'GAME', 'WOLF', 'BEAR', 'FROG', 'DEER', 'DUCK', 'HAWK',
    'CAKE', 'MILK', 'SOUP', 'RICE', 'BEAN', 'CORN', 'PLUM', 'PEAR',
    'GOLD', 'IRON', 'JADE', 'RUBY', 'SILK', 'WOOL', 'CLAY', 'COAL',
    'HILL', 'LAKE', 'WAVE', 'CAVE', 'PATH', 'PEAK', 'POND', 'REEF',
    'SONG', 'DRUM', 'HORN', 'BELL', 'POEM', 'TALE', 'MYTH', 'PLAY',
    'KING', 'DUKE', 'HERO', 'SAGE', 'MONK', 'CHEF', 'MAGE', 'BARD',
    'SHIP', 'CART', 'BIKE', 'SLED', 'RAFT', 'KITE', 'DOME', 'ARCH',
    'ROSE', 'FERN', 'VINE', 'LEAF', 'STEM', 'ROOT', 'PALM', 'PINE',
    'DAWN', 'DUSK', 'NOON', 'GLOW', 'BEAM', 'BLUR', 'MIST', 'HAZE',
    'HOPE', 'WISH', 'CALM', 'ZEAL', 'GRIT', 'SOUL', 'MIND', 'WILL',
    'NEST', 'HIVE', 'LAIR', 'FORT', 'TENT', 'BARN', 'MILL', 'PIER',
    'WAND', 'COIN', 'MASK', 'RING', 'CAPE', 'HELM', 'CLAW', 'FANG',
    'FIRE', 'TIDE', 'GUST', 'BOLT', 'SURF', 'FOAM', 'SAND', 'DUST',
    // Additional unique 4-letter words
    'MAZE', 'GRID', 'CODE', 'QUIZ', 'ECHO', 'VOID', 'FLUX', 'APEX',
    'LYNX', 'SWAN', 'CROW', 'MOTH', 'WASP', 'CRAB', 'SEAL', 'TOAD',
    'BREW', 'STEW', 'BAKE', 'ROAM', 'SOAR', 'DIVE', 'LEAP', 'SPIN',
  ],
  he: [
    // Hebrew 4-letter words (for daily challenge - replaced obvious ones)
    'בית', 'מים', 'עולם', 'אדם', 'דבר',
    'עין', 'ראש', 'ילד', 'ספר', 'חבר',
    'דלת', 'חלון', 'שמש', 'ירח', 'כוכב',
    'פרח', 'סוס', 'כלב', 'ציפור', 'דגים',
    'ארנב', 'נמר', 'זאב', 'דוב', 'אריה',
    'עוגה', 'לחם', 'חלב', 'מים', 'מרק',
    'זהב', 'כסף', 'נחושת', 'ברזל', 'עץ',
    'הר', 'נהר', 'ים', 'אגם', 'גבעה',
    'שיר', 'ספר', 'מכתב', 'סיפור', 'חלום',
    'מלך', 'גיבור', 'חכם', 'אמן', 'רופא',
    'אש', 'מים', 'רוח', 'אדמה', 'שמים',
    'אור', 'צל', 'לילה', 'יום', 'בוקר',
  ],
  sv: [
    // Swedish 3-4 letter words
    'HUS', 'DAG', 'ÖGA', 'ÖRA', 'ARM', 'BEN', 'BOK', 'BIL', 'SOL', 'VÄG',
    // Swedish 5-letter words
    'VATTEN', 'VÄRLD', 'PLATS', 'LJUD', 'KRAFT',
    'BÄSTA', 'FÖRSTA', 'SISTA', 'RUNDA', 'KLAR',
    'STEN', 'HUND', 'KATT', 'FÅGEL', 'BLOM',
    // Swedish 6-letter words
    'SLOTT', 'TRÄDGÅRD', 'MARKNAD', 'FÖNSTER',
    'NATUR', 'HIMMEL', 'VINTER', 'SOMMAR',
    // Swedish 7-letter words
    'MORGON', 'KVÄLL', 'PERFEKT', 'FANTASTISK'
  ],
  ja: [
    // Japanese 2-3 character words
    '日本', '東京', '学校', '先生', '学生',
    '友達', '家族', '会社', '仕事', '時間',
    '天気', '音楽', '映画', '料理', '旅行',
    '電車', '新聞', '本', '犬', '猫',
    '花', '木', '山', '川', '海',
    // Japanese 3-4 character compound words
    '日本語', '図書館', '大学', '病院', '空港',
    '公園', '駅', '銀行', '郵便局', '美術館'
  ],
  es: [
    // Spanish 3-4 letter words
    'SOL', 'MAR', 'PAN', 'SAL', 'LUZ', 'VOZ', 'PAZ', 'REY', 'LEY', 'RÍO',
    'CASA', 'AGUA', 'VIDA', 'AMOR', 'MESA', 'LIBRO', 'PERRO', 'GATO',
    // Spanish 5-letter words
    'MUNDO', 'LUGAR', 'TIEMPO', 'GENTE', 'NOCHE',
    'PLANTA', 'TIERRA', 'CIELO', 'FIESTA', 'AMIGO',
    // Spanish 6-letter words
    'CASTILLO', 'JARDÍN', 'MERCADO', 'PUENTE',
    'VENTANA', 'SIMPLE', 'MODERNO', 'DORADO',
    // Spanish 7-letter words
    'COCINA', 'MAÑANA', 'PERFECTO', 'NATURAL', 'FANTÁSTICO'
  ],
  fr: [
    // French 3-4 letter words
    'CHAT', 'PAIN', 'LUNE', 'ÉTOILE', 'ARBRE', 'FLEUR', 'JOUR', 'NUIT',
    // French 5-letter words
    'MAISON', 'MONDE', 'TEMPS', 'VILLE', 'GRAND',
    'PETIT', 'BELLE', 'FORCE', 'PLACE', 'CHOSE',
    'LIVRE', 'CHIEN', 'AMOUR', 'JOLIE', 'RÊVE',
    // French 6-letter words
    'JARDIN', 'SOLEIL', 'NATURE', 'MONTAGNE', 'RIVIÈRE'
  ],
  de: [
    // German 3-4 letter words
    'HAUS', 'BAUM', 'BUCH', 'HUND', 'KATZE', 'SONNE', 'MOND', 'STERN',
    // German 5-letter words
    'WELT', 'ZEIT', 'STADT', 'GROSS', 'KLEIN',
    'KRAFT', 'PLATZ', 'SACHE', 'WASSER', 'LIEBE',
    // German 6-letter words
    'GARTEN', 'FENSTER', 'NATUR', 'HIMMEL', 'SOMMER'
  ]
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
export function getSameLengthWords(targetWord: string, language: Language, random: () => number): string[] {
  const targetLength = targetWord.length;
  const targetUpper = targetWord.toUpperCase();

  // Collect same-length words from helper lists
  const helperWords = SAME_LENGTH_HELPER_WORDS[language]?.[targetLength] || [];

  // Also collect same-length words from TARGET_WORD_LISTS
  const targetWords = (TARGET_WORD_LISTS[language] || [])
    .filter(w => w.length === targetLength);

  // Combine both sources and remove duplicates and the target word itself
  const allWords = [...new Set([...helperWords, ...targetWords])]
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
