/**
 * Word Bank Static Data
 *
 * Static fallback word lists and language-specific constants
 * for daily challenge word selection.
 *
 * @module lib/dailyChallenge/wordBankData
 */

import type { Language } from '@/types';

/** Validation status for words (especially Wikipedia-sourced) */
export type ValidationStatus = 'pending' | 'approved' | 'rejected';

/** Word status in the bank */
export type WordStatus = 'active' | 'blocked' | 'used';

export interface WordBankEntry {
  word: string;
  source: 'word_bank' | 'dictionary' | 'static';
  difficulty_score?: number;
  category?: string;
}

// Word length constraints by language
// NOTE: max must stay <= MAX_TARGET_WORD_LENGTH (6) in
// utils/dailyChallenge/constants.ts. Japanese uses kanji compounds (2-4 chars).
export const WORD_LENGTH_RANGE: Record<Language, { min: number; max: number }> = {
  en: { min: 4, max: 6 },
  he: { min: 4, max: 6 },
  sv: { min: 4, max: 6 },
  ja: { min: 2, max: 4 },
  es: { min: 4, max: 6 },
  fr: { min: 4, max: 6 },
  de: { min: 4, max: 6 },
};

// Expanded static fallback word lists by language
// These are curated for daily challenges: interesting, common enough to know, varied difficulty
export const STATIC_WORD_LISTS: Record<Language, string[]> = {
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
