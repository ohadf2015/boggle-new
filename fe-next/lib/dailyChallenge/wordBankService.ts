/**
 * Word Bank Service
 *
 * Manages the daily challenge word bank with multiple word sources:
 * 1. Database word bank (curated, admin-managed)
 * 2. Main validation dictionary (npm packages + approved files)
 * 3. Static fallback lists (hardcoded for reliability)
 *
 * @module lib/dailyChallenge/wordBankService
 */

import type { Language } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Word length constraints by language
const WORD_LENGTH_RANGE: Record<Language, { min: number; max: number }> = {
  en: { min: 4, max: 8 },
  he: { min: 4, max: 8 },
  sv: { min: 4, max: 8 },
  ja: { min: 2, max: 4 },
  es: { min: 4, max: 8 },
  fr: { min: 4, max: 8 },
  de: { min: 4, max: 8 },
};

// Expanded static fallback word lists by language
// These are curated for daily challenges: interesting, common enough to know, varied difficulty
const STATIC_WORD_LISTS: Record<Language, string[]> = {
  en: [
    // Nature & Space
    'AURORA', 'ZENITH', 'NEBULA', 'QUARTZ', 'PRISM', 'GLACIER', 'PHOENIX', 'VORTEX',
    'CRYSTAL', 'COSMOS', 'LUNAR', 'SOLAR', 'METEOR', 'COMET', 'ECLIPSE', 'ORBIT',
    'STORM', 'THUNDER', 'BREEZE', 'FROST', 'BLAZE', 'SPARK', 'FLAME', 'EMBER',
    'OCEAN', 'RIVER', 'CANYON', 'VALLEY', 'FOREST', 'MEADOW', 'DELTA', 'RIDGE',
    // Interesting Words
    'CIPHER', 'QUEST', 'VOYAGE', 'ENIGMA', 'PUZZLE', 'RIDDLE', 'MYTH', 'LEGEND',
    'BEACON', 'HAVEN', 'OASIS', 'REFUGE', 'SUMMIT', 'APEX', 'PEAK', 'ZENITH',
    'NOBLE', 'ROYAL', 'REGAL', 'GRAND', 'EPIC', 'BOLD', 'BRAVE', 'SWIFT',
    'CHARM', 'GRACE', 'SPIRIT', 'SOUL', 'DREAM', 'WISH', 'HOPE', 'FAITH',
    // Action & Movement
    'SURGE', 'DRIFT', 'SOAR', 'GLIDE', 'DASH', 'LEAP', 'BOUND', 'SPRING',
    'TWIST', 'SPIN', 'SWIRL', 'WHIRL', 'DANCE', 'FLOW', 'STREAM', 'RUSH',
    // Objects & Concepts
    'PRISM', 'JEWEL', 'CROWN', 'SWORD', 'SHIELD', 'HELM', 'CLOAK', 'ROBE',
    'TOWER', 'CASTLE', 'REALM', 'THRONE', 'GUILD', 'CLAN', 'TRIBE', 'DYNASTY',
    // More Interesting Words
    'ZEPHYR', 'MYSTIC', 'ARCANE', 'ANCIENT', 'HIDDEN', 'SECRET', 'SHADOW', 'SHADE',
    'WHISPER', 'MURMUR', 'ECHO', 'CHIME', 'MELODY', 'RHYTHM', 'TEMPO', 'PULSE',
    'VIVID', 'LUCID', 'SERENE', 'TRANQUIL', 'PLACID', 'GENTLE', 'TENDER', 'SOFT',
    'FIERCE', 'WILD', 'RUGGED', 'STARK', 'HARSH', 'GRIM', 'STERN', 'STOIC',
    // Additional Varied Words
    'ANCHOR', 'BRIDGE', 'CHALICE', 'DAGGER', 'EMBLEM', 'FALCON', 'GOBLET', 'HARBOR',
    'IVORY', 'JASPER', 'KNIGHT', 'LANTERN', 'MARBLE', 'NECTAR', 'ORCHID', 'PARAGON',
    'QUIVER', 'RAPTOR', 'SCEPTER', 'TITAN', 'UTOPIA', 'VELVET', 'WARDEN', 'ZEALOT',
  ],
  he: [
    // טבע ומרחב
    'אוקיינוס', 'קשת', 'שביט', 'אופק', 'מדבר', 'נהר', 'הר', 'עמק',
    'יער', 'פרח', 'עץ', 'ענן', 'שמש', 'ירח', 'כוכב', 'רוח',
    'גשם', 'שלג', 'ברק', 'רעם', 'אש', 'מים', 'אדמה', 'אויר',
    // מושגים ורגשות
    'חלום', 'תקווה', 'אהבה', 'שמחה', 'שלום', 'חופש', 'אמת', 'צדק',
    'אור', 'חושך', 'סוד', 'חידה', 'פלא', 'נס', 'קסם', 'כוח',
    // פעולות ותנועה
    'מסע', 'הרפתקה', 'חיפוש', 'גילוי', 'יצירה', 'בניה', 'צמיחה', 'פריחה',
    // חפצים ומקומות
    'מגדל', 'טירה', 'ארמון', 'גשר', 'שער', 'דרך', 'נתיב', 'מסלול',
    'כתר', 'חרב', 'מגן', 'ספר', 'מפתח', 'אוצר', 'פנינה', 'יהלום',
    // מילים מעניינות נוספות
    'ברית', 'גורל', 'דור', 'הוד', 'ויתור', 'זוהר', 'חזון', 'טוהר',
    'יופי', 'כבוד', 'לב', 'מלך', 'נצח', 'סמל', 'עוז', 'פאר',
    'צבא', 'קרב', 'רוח', 'שריון', 'תפארת', 'אמונה', 'בטחון', 'גבורה',
  ],
  sv: [
    // Natur och rymd
    'AURORA', 'GALAX', 'KOMET', 'METEOR', 'PLANET', 'NEBULA', 'KOSMOS', 'ORBIT',
    'STORM', 'VIND', 'FROST', 'SNOD', 'REGN', 'DIMMA', 'MOLN', 'HIMMEL',
    'SKOG', 'BERG', 'FJORD', 'SJOD', 'FLOD', 'STRAND', 'KUST', 'VALL',
    // Intressanta ord
    'DRAKEN', 'RIDDARE', 'SLOTT', 'TORN', 'KRONA', 'SVÄRD', 'SKÖLD', 'HJÄLM',
    'MAGI', 'TROLLDOM', 'SAGA', 'LEGEND', 'MYTE', 'DRÖM', 'VISION', 'ÖNSKAN',
    'ÄVENTYR', 'RESA', 'QUEST', 'JAKT', 'SÖKANDE', 'UPPTÄCKT', 'FYND', 'SKATT',
    // Känslor och koncept
    'HOPP', 'TROGEN', 'MOD', 'STYRKA', 'VISDOM', 'FRED', 'LUGN', 'HARMONI',
    'GLÄDJE', 'LYCKA', 'KÄRLEK', 'VÄNSKAP', 'TILLIT', 'RESPEKT', 'HEDER', 'ÄRA',
    // Fler varierade ord
    'FJÄRIL', 'ÖRNEN', 'VARGEN', 'BJÖRNEN', 'ÄLGEN', 'RÄVEN', 'HJORTEN', 'SVANEN',
    'ANKARE', 'FYREN', 'KOMPASS', 'SEGLEN', 'RODDEN', 'KAPTEN', 'BESÄTTNING', 'HAMN',
  ],
  ja: [
    // 自然・宇宙
    '星空', '銀河', '流星', '月光', '日輪', '虹彩', '雲海', '風雲',
    '山河', '森林', '海洋', '大地', '火山', '氷河', '砂漠', '草原',
    // 感情・概念
    '希望', '夢想', '勇気', '知恵', '真実', '正義', '自由', '平和',
    '愛情', '友情', '信頼', '尊敬', '名誉', '栄光', '勝利', '成功',
    // 動作・状態
    '冒険', '探求', '発見', '創造', '挑戦', '成長', '進化', '変革',
    // 物・場所
    '城塞', '王国', '宝石', '財宝', '剣術', '武道', '忍術', '魔法',
    // 追加の興味深い言葉
    '英雄', '伝説', '神話', '物語', '歴史', '未来', '運命', '奇跡',
    '光輝', '暗闘', '激戦', '決断', '覚悟', '誓約', '約束', '絆',
  ],
  es: [
    // Naturaleza y espacio
    'AURORA', 'COSMOS', 'NEBULA', 'COMETA', 'METEORO', 'PLANETA', 'ECLIPSE', 'ORBITA',
    'OCEANO', 'MONTANA', 'VALLE', 'BOSQUE', 'DESIERTO', 'SELVA', 'PRADERA', 'COSTA',
    'TORMENTA', 'VIENTO', 'LLUVIA', 'NIEVE', 'FUEGO', 'AGUA', 'TIERRA', 'CIELO',
    // Palabras interesantes
    'DRAGON', 'CASTILLO', 'CORONA', 'ESPADA', 'ESCUDO', 'TRONO', 'REINO', 'IMPERIO',
    'MAGIA', 'LEYENDA', 'MITO', 'CUENTO', 'SUENO', 'VISION', 'DESTINO', 'FORTUNA',
    'AVENTURA', 'VIAJE', 'BUSQUEDA', 'TESORO', 'MISTERIO', 'SECRETO', 'ENIGMA', 'PUZZLE',
    // Emociones y conceptos
    'ESPERANZA', 'CORAJE', 'VALOR', 'FUERZA', 'SABIDURIA', 'VERDAD', 'JUSTICIA', 'LIBERTAD',
    'ALEGRIA', 'FELICIDAD', 'AMOR', 'AMISTAD', 'CONFIANZA', 'RESPETO', 'HONOR', 'GLORIA',
    // Más palabras variadas
    'AGUILA', 'LOBO', 'TIGRE', 'LEON', 'HALCON', 'SERPIENTE', 'FENIX', 'UNICORNIO',
    'ANCLA', 'FARO', 'BRUJULA', 'BARCO', 'PUERTO', 'CAPITAN', 'NAVEGANTE', 'PIRATA',
  ],
  fr: [
    // Nature et espace
    'AURORE', 'COSMOS', 'NEBULA', 'COMETE', 'METEORE', 'PLANETE', 'ECLIPSE', 'ORBITE',
    'OCEAN', 'MONTAGNE', 'VALLEE', 'FORET', 'DESERT', 'JUNGLE', 'PRAIRIE', 'COTE',
    'ORAGE', 'VENT', 'PLUIE', 'NEIGE', 'FEU', 'EAU', 'TERRE', 'CIEL',
    // Mots interessants
    'DRAGON', 'CHATEAU', 'COURONNE', 'EPEE', 'BOUCLIER', 'TRONE', 'ROYAUME', 'EMPIRE',
    'MAGIE', 'LEGENDE', 'MYTHE', 'CONTE', 'REVE', 'VISION', 'DESTIN', 'FORTUNE',
    'AVENTURE', 'VOYAGE', 'QUETE', 'TRESOR', 'MYSTERE', 'SECRET', 'ENIGME', 'PUZZLE',
    // Emotions et concepts
    'ESPOIR', 'COURAGE', 'VALEUR', 'FORCE', 'SAGESSE', 'VERITE', 'JUSTICE', 'LIBERTE',
    'JOIE', 'BONHEUR', 'AMOUR', 'AMITIE', 'CONFIANCE', 'RESPECT', 'HONNEUR', 'GLOIRE',
    // Plus de mots varies
    'AIGLE', 'LOUP', 'TIGRE', 'LION', 'FAUCON', 'SERPENT', 'PHENIX', 'LICORNE',
    'ANCRE', 'PHARE', 'BOUSSOLE', 'NAVIRE', 'PORT', 'CAPITAINE', 'NAVIGATEUR', 'PIRATE',
  ],
  de: [
    // Natur und Weltraum
    'AURORA', 'KOSMOS', 'NEBEL', 'KOMET', 'METEOR', 'PLANET', 'FINSTER', 'ORBIT',
    'OZEAN', 'BERGE', 'TAL', 'WALD', 'WUESTE', 'DSCHUNGEL', 'WIESE', 'KUESTE',
    'STURM', 'WIND', 'REGEN', 'SCHNEE', 'FEUER', 'WASSER', 'ERDE', 'HIMMEL',
    // Interessante Worte
    'DRACHEN', 'SCHLOSS', 'KRONE', 'SCHWERT', 'SCHILD', 'THRON', 'REICH', 'KAISER',
    'MAGIE', 'LEGENDE', 'MYTHOS', 'SAGE', 'TRAUM', 'VISION', 'SCHICKSAL', 'GLUECK',
    'ABENTEUER', 'REISE', 'SUCHE', 'SCHATZ', 'GEHEIMNIS', 'RAETSEL', 'MYSTERIUM', 'PUZZLE',
    // Emotionen und Konzepte
    'HOFFNUNG', 'MUT', 'TAPFER', 'KRAFT', 'WEISHEIT', 'WAHRHEIT', 'RECHT', 'FREIHEIT',
    'FREUDE', 'GLUECK', 'LIEBE', 'FREUND', 'VERTRAUEN', 'RESPEKT', 'EHRE', 'RUHM',
    // Mehr abwechslungsreiche Worte
    'ADLER', 'WOLF', 'TIGER', 'LOEWE', 'FALKE', 'SCHLANGE', 'PHOENIX', 'EINHORN',
    'ANKER', 'LEUCHT', 'KOMPASS', 'SCHIFF', 'HAFEN', 'KAPITAEN', 'SEEMANN', 'PIRAT',
  ],
};

export interface WordBankEntry {
  word: string;
  source: 'word_bank' | 'dictionary' | 'static';
  difficulty_score?: number;
  category?: string;
}

/**
 * Get random words from the word bank table
 */
export async function getWordsFromWordBank(
  supabase: SupabaseClient,
  language: Language,
  count: number,
  excludeWords: Set<string>
): Promise<WordBankEntry[]> {
  try {
    // Use the database function for efficient random selection
    const { data, error } = await supabase.rpc('get_random_words_from_bank', {
      p_language: language,
      p_count: count,
      p_exclude_words: Array.from(excludeWords),
      p_min_days_since_used: 30,
    });

    if (error) {
      console.error('Error fetching from word bank:', error);
      return [];
    }

    return (data || []).map((row: { word: string; source: string; difficulty_score: number; category: string }) => ({
      word: row.word.toUpperCase(),
      source: 'word_bank' as const,
      difficulty_score: row.difficulty_score,
      category: row.category,
    }));
  } catch (error) {
    console.error('Word bank query failed:', error);
    return [];
  }
}

/**
 * Get random words from the static fallback list
 */
export function getWordsFromStaticList(
  language: Language,
  count: number,
  excludeWords: Set<string>
): WordBankEntry[] {
  const wordList = STATIC_WORD_LISTS[language] || STATIC_WORD_LISTS.en;
  const lengthRange = WORD_LENGTH_RANGE[language];

  // Filter by length and exclusion
  const availableWords = wordList.filter(word => {
    const normalizedWord = word.toUpperCase();
    return (
      normalizedWord.length >= lengthRange.min &&
      normalizedWord.length <= lengthRange.max &&
      !excludeWords.has(normalizedWord)
    );
  });

  // Shuffle and take requested count
  const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(word => ({
    word: word.toUpperCase(),
    source: 'static' as const,
  }));
}

/**
 * Seed the word bank with static words
 * Call this to populate the database with initial words
 */
export async function seedWordBank(
  supabase: SupabaseClient,
  language: Language
): Promise<{ inserted: number; skipped: number; errors: number }> {
  const wordList = STATIC_WORD_LISTS[language] || [];
  const lengthRange = WORD_LENGTH_RANGE[language];

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const word of wordList) {
    const normalizedWord = word.toUpperCase();

    // Skip words outside length range
    if (normalizedWord.length < lengthRange.min || normalizedWord.length > lengthRange.max) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('daily_challenge_word_bank')
      .upsert(
        {
          word: normalizedWord,
          language,
          source: 'static',
          status: 'active',
        },
        {
          onConflict: 'word,language',
          ignoreDuplicates: true,
        }
      );

    if (error) {
      if (error.code === '23505') {
        // Duplicate - already exists
        skipped++;
      } else {
        console.error('Error inserting word:', normalizedWord, error);
        errors++;
      }
    } else {
      inserted++;
    }
  }

  return { inserted, skipped, errors };
}

/**
 * Add words to the word bank from dictionary
 * This imports random words from the main validation dictionary
 */
export async function importWordsFromDictionary(
  supabase: SupabaseClient,
  language: Language,
  words: string[],
  source: 'dictionary' | 'wikipedia' | 'admin' = 'dictionary'
): Promise<{ inserted: number; skipped: number; errors: number }> {
  const lengthRange = WORD_LENGTH_RANGE[language];

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const word of words) {
    const normalizedWord = word.toUpperCase();

    // Skip words outside length range
    if (normalizedWord.length < lengthRange.min || normalizedWord.length > lengthRange.max) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('daily_challenge_word_bank')
      .upsert(
        {
          word: normalizedWord,
          language,
          source,
          status: 'active',
        },
        {
          onConflict: 'word,language',
          ignoreDuplicates: true,
        }
      );

    if (error) {
      if (error.code === '23505') {
        skipped++;
      } else {
        console.error('Error importing word:', normalizedWord, error);
        errors++;
      }
    } else {
      inserted++;
    }
  }

  return { inserted, skipped, errors };
}

/**
 * Block a word from being used in daily challenges
 */
export async function blockWord(
  supabase: SupabaseClient,
  word: string,
  language: Language,
  adminId: string,
  reason?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('block_word_bank_word', {
    p_word: word.toUpperCase(),
    p_language: language,
    p_admin_id: adminId,
    p_reason: reason || null,
  });

  if (error) {
    console.error('Error blocking word:', error);
    return false;
  }

  return data === true;
}

/**
 * Unblock a previously blocked word
 */
export async function unblockWord(
  supabase: SupabaseClient,
  word: string,
  language: Language
): Promise<boolean> {
  const { data, error } = await supabase.rpc('unblock_word_bank_word', {
    p_word: word.toUpperCase(),
    p_language: language,
  });

  if (error) {
    console.error('Error unblocking word:', error);
    return false;
  }

  return data === true;
}

/**
 * Mark a word as used (updates usage tracking)
 */
export async function markWordAsUsed(
  supabase: SupabaseClient,
  word: string,
  language: Language
): Promise<void> {
  const { error } = await supabase.rpc('mark_word_bank_used', {
    p_word: word.toUpperCase(),
    p_language: language,
  });

  if (error) {
    console.error('Error marking word as used:', error);
  }
}

/**
 * Get word bank statistics
 */
export async function getWordBankStats(
  supabase: SupabaseClient,
  language: Language
): Promise<{
  total: number;
  active: number;
  blocked: number;
  bySource: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from('daily_challenge_word_bank')
    .select('status, source')
    .eq('language', language);

  if (error) {
    console.error('Error fetching word bank stats:', error);
    return { total: 0, active: 0, blocked: 0, bySource: {} };
  }

  const stats = {
    total: data.length,
    active: data.filter(w => w.status === 'active').length,
    blocked: data.filter(w => w.status === 'blocked').length,
    bySource: {} as Record<string, number>,
  };

  for (const word of data) {
    stats.bySource[word.source] = (stats.bySource[word.source] || 0) + 1;
  }

  return stats;
}

/**
 * Get all words in the word bank (for admin management)
 */
export async function getWordBankWords(
  supabase: SupabaseClient,
  language: Language,
  options: {
    status?: 'active' | 'blocked' | 'used';
    source?: string;
    limit?: number;
    offset?: number;
    search?: string;
  } = {}
): Promise<{
  words: Array<{
    id: string;
    word: string;
    source: string;
    status: string;
    times_used: number;
    last_used_at: string | null;
    blocked_reason: string | null;
    created_at: string;
  }>;
  total: number;
}> {
  let query = supabase
    .from('daily_challenge_word_bank')
    .select('*', { count: 'exact' })
    .eq('language', language)
    .order('word', { ascending: true });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.source) {
    query = query.eq('source', options.source);
  }

  if (options.search) {
    query = query.ilike('word', `%${options.search}%`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching word bank words:', error);
    return { words: [], total: 0 };
  }

  return {
    words: data || [],
    total: count || 0,
  };
}

/**
 * Delete a word from the word bank permanently
 */
export async function deleteWordFromBank(
  supabase: SupabaseClient,
  word: string,
  language: Language
): Promise<boolean> {
  const { error } = await supabase
    .from('daily_challenge_word_bank')
    .delete()
    .eq('word', word.toUpperCase())
    .eq('language', language);

  if (error) {
    console.error('Error deleting word:', error);
    return false;
  }

  return true;
}

// Export the static lists for direct access if needed
export { STATIC_WORD_LISTS, WORD_LENGTH_RANGE };
