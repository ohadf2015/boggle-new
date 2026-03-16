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
export const TARGET_WORD_LISTS: Record<Language, string[]> = {
  en: [
    // ── Animals & Creatures (30) ──
    'BIRD', 'FISH', 'WOLF', 'BEAR', 'FROG', 'DEER', 'DUCK', 'HAWK',
    'LYNX', 'SWAN', 'CROW', 'MOTH', 'WASP', 'CRAB', 'SEAL', 'TOAD',
    'DOVE', 'MOLE', 'NEWT', 'WREN', 'OTTER', 'RAVEN', 'CRANE', 'BISON',
    'SHARK', 'WHALE', 'EAGLE', 'TIGER', 'HORSE', 'SNAKE',
    // ── Nature & Landscape (28) ──
    'MOON', 'STAR', 'RAIN', 'WIND', 'SNOW', 'TREE', 'ROCK', 'SAND',
    'HILL', 'LAKE', 'WAVE', 'CAVE', 'PATH', 'PEAK', 'POND', 'REEF',
    'LEAF', 'FERN', 'VINE', 'MOSS', 'DUNE', 'GLEN', 'TIDE', 'MIST',
    'CLOUD', 'RIVER', 'OCEAN', 'BEACH',
    // ── Food & Flavor (20) ──
    'CAKE', 'MILK', 'SOUP', 'RICE', 'BEAN', 'CORN', 'PLUM', 'PEAR',
    'LIME', 'MINT', 'PEACH', 'GRAPE', 'LEMON', 'BREAD', 'OLIVE', 'CREAM',
    'FEAST', 'SPICE', 'MANGO', 'COCOA',
    // ── Magic & Fantasy (20) ──
    'WAND', 'RUNE', 'GLOW', 'FIRE', 'BOLT', 'FLAME', 'SPARK', 'CHARM',
    'SPELL', 'GHOST', 'FAIRY', 'QUEST', 'REALM', 'CURSE', 'FORGE',
    'DRAGON', 'KNIGHT', 'WIZARD', 'PIRATE', 'CASTLE',
    // ── Colors & Materials (16) ──
    'GOLD', 'IRON', 'JADE', 'RUBY', 'SILK', 'WOOL', 'CLAY', 'COAL',
    'TEAL', 'OPAL', 'PEARL', 'CORAL', 'AMBER', 'IVORY', 'SILVER', 'BRONZE',
    // ── Actions & Movement (16) ──
    'DASH', 'LEAP', 'SPIN', 'DIVE', 'SOAR', 'ROAM', 'BREW', 'BAKE',
    'DANCE', 'BLOOM', 'BLAZE', 'SURGE', 'SWOOP', 'GLIDE', 'SWIFT', 'BRAVE',
    // ── Emotions & Character (14) ──
    'HOPE', 'WISH', 'CALM', 'GRIT', 'SOUL', 'BOLD', 'KIND',
    'DREAM', 'PRIDE', 'HEART', 'PEACE', 'NOBLE', 'GRACE', 'GRAND',
    // ── Objects & Tools (16) ──
    'DRUM', 'BELL', 'HORN', 'SONG', 'COIN', 'MASK', 'RING', 'KITE',
    'SHIP', 'ARCH', 'DOME', 'HELM', 'CROWN', 'SWORD', 'TORCH', 'SHELL',
    // ── Places & Structures (18) ──
    'NEST', 'FORT', 'BARN', 'MILL', 'PIER', 'TENT', 'LAIR', 'HIVE',
    'TOWER', 'GROVE', 'TRAIL', 'SHORE', 'CLIFF', 'ARENA', 'GARDEN',
    'FOREST', 'ISLAND', 'VALLEY',
    // ── Weather & Sky (12) ──
    'DAWN', 'DUSK', 'GUST', 'FOAM', 'DUST', 'FROST', 'STORM', 'SHADE',
    'SUNSET', 'BREEZE', 'MEADOW', 'STREAM',
    // ── Extra vivid words (10) ──
    'MAZE', 'ECHO', 'HERO', 'SAGE', 'CHEF', 'KING', 'TALE', 'MYTH',
    'SCOUT', 'MEDAL',
  ],
  he: [
    // ── Hebrew 4-letter targets (min 4 chars for adequate challenge) ──
    // 3-letter words (בית, מים, etc.) are in SAME_LENGTH_HELPER_WORDS
    'עולם', 'חלון', 'כוכב', 'ציפור', 'דגים', 'ארנב', 'אריה', 'עוגה',
    'ברזל', 'גבעה', 'מכתב', 'סיפור', 'חלום', 'גיבור', 'אדמה', 'שמים',
    'לילה', 'בוקר', 'שולחן', 'מנורה', 'חתול', 'מורה', 'כיסא', 'תפוח',
    'מטבע', 'טירה', 'משחק', 'סירה',
    'מגדל', 'ילדים', 'גלידה', 'תפוז',
    // ── Hebrew 5-letter ──
    'נחושת', 'מחשב', 'טלפון', 'חיוך', 'משפחה', 'חברים', 'אהבה', 'שמחה',
    'בריאות', 'תלמיד', 'ארמון', 'אביב', 'חורף', 'אומץ', 'שלום',
    'חופש', 'שוקולד', 'פסנתר', 'מוזיקה', 'כדורגל',
    'הרפתקה', 'מדבר', 'סתיו', 'מלכה',
  ],
  sv: [
    // ── Swedish 4-letter (concrete nouns) ──
    'HUND', 'KATT', 'STEN', 'BERG', 'REGN', 'VIND', 'NATT', 'LJUS',
    'DÖRR', 'BORD', 'STOL', 'GLAS', 'BOLL', 'FISK', 'BLAD', 'SNÖN',
    'MÖRK', 'TÄLT', 'KUNG', 'BORG', 'TORN', 'SÅNG', 'DANS', 'GULL',
    'HJUL', 'MASK', 'BÅGE', 'VÄGG', 'GOLV', 'SÄNG',
    // ── Swedish 5-letter ──
    'FÅGEL', 'SOLEN', 'KRAFT', 'PLATS', 'DRAKE', 'SVÄRD', 'SLOTT',
    'NATUR', 'BJÖRN', 'MOLN', 'FLOD', 'FRUKT', 'BRÖD', 'FROST',
    'DRÖM', 'LJUD', 'HÄST', 'BLOM', 'HIMMEL', 'STRAND',
    'BÄVER', 'HJÄLM', 'STRID', 'GULD', 'MÅNEN',
    'KLAR', 'RUNDA', 'VATTEN', 'VÄRLD', 'VALEN',
    // ── Swedish 6-letter ──
    'MORGON', 'KVÄLL', 'VINTER', 'SOMMAR', 'FÖNSTER', 'MARKNAD',
    'TRÄDGÅRD', 'ÄVENTYR', 'RIDDARE', 'SKOGEN', 'FJÄRIL',
    'KANIN', 'REGNBÅGE', 'GNISTA', 'HONUNG',
    'SILVER', 'BLOMMA', 'SOLNEDGÅNG', 'DJUNGEL', 'SJÖMAN',
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
    // ── Spanish 4-letter (vivid nouns) ──
    'CASA', 'AGUA', 'VIDA', 'AMOR', 'MESA', 'LUNA', 'FLOR', 'ROSA',
    'GATO', 'PATO', 'PERA', 'MANO', 'CARA', 'BOCA', 'LAGO', 'RANA',
    'LOBO', 'NIDO', 'VELA', 'RAYO', 'ARCO', 'MAPA', 'NUBE', 'MIEL',
    'PIEL', 'NAVE', 'COPO', 'HILO', 'DADO', 'VINO',
    // ── Spanish 5-letter ──
    'LIBRO', 'MUNDO', 'NOCHE', 'PLAYA', 'CAMPO', 'MONTE', 'LECHE', 'AMIGO',
    'CIELO', 'ARBOL', 'TIGRE', 'PERRO', 'FUEGO', 'HIELO', 'NIEVE',
    'BARCO', 'TORRE', 'REINA', 'BRUJA', 'MAGIA', 'PIEDRA', 'ARENA',
    'SELVA', 'BOSQUE', 'CUEVA', 'GLOBO', 'DANZA', 'CANTO', 'FRESA',
    'LIMON', 'MANGO', 'ABEJA', 'BUHO', 'CORAL', 'CONCHA', 'ESPADA',
    'ISLA', 'VIENTO', 'CABRA', 'TIERRA',
    // ── Spanish 6-letter ──
    'FIESTA', 'COCINA', 'JARDIN', 'TIEMPO', 'PLANTA', 'MERCADO', 'VENTANA',
    'DRAGON', 'PIRATA', 'TESORO', 'CORONA', 'ESCUDO', 'CAMINO', 'ESTRELLA',
    'CASCADA', 'VOLCAN', 'OCEANO', 'DELFIN', 'TORTUGA', 'CONEJO', 'CABALLO',
    'HALCON', 'MADERA', 'CUERDA', 'MUSICA', 'BANDERA', 'FUENTE', 'MOLINO',
    'REGALO', 'SONRISA',
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
    'MAISON', 'JARDIN', 'SOLEIL', 'NATURE', 'RIVIÈRE', 'FORÊT',
    'CHÂTEAU', 'MONTAGNE', 'DRAGON', 'TRÉSOR', 'PLAGE', 'OCÉAN',
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
    'GARTEN', 'FENSTER', 'NATUR', 'HIMMEL', 'SOMMER', 'WINTER',
    'HERBST', 'SCHULE', 'KIRCHE', 'BRÜCKE', 'DRACHE', 'RITTER',
  ],
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
