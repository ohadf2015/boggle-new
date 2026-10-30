// Played dates regenerate from these lists, so LEGACY_WHEEL_SOURCES must never change.

import type { Language } from '@/types';

export const WHEEL_V2_START_DATE = '2026-11-01';

export const LEGACY_WHEEL_SOURCES: Record<Language, string[]> = {
  en: [
    'BREATHING', 'COUNTRIES', 'DANGEROUS', 'EDUCATION', 'FINGERTIP',
    'GARDENING', 'HARMONIZE', 'IMAGINERY', 'JUMBOSIZE', 'KNOWLEDGE',
    'LANDSCAPE', 'MACHINERY', 'NIGHTCLUB', 'OPERATING', 'PLAYSCORE',
    'QUESTIONS', 'REACTIONS', 'SCOLARING', 'TRAMLINES', 'UPLIGHTER',
    'VOLCANISM', 'WORSENING', 'EXPLORING', 'YEARNINGS', 'SPRINKLED',
    'BLUNDERS', 'COMPANIES', 'DIRECTION', 'EXPORTING', 'FLOWERING',
    'GOVERNING', 'HORSEBACK', 'INVADERS', 'LAUNCHING', 'MOLECULES',
    'NUMBERING', 'OUTSCORED', 'PRACTICED', 'REMAINING', 'SURPRISED',
    'THOUSANDS', 'UNMASKING', 'VICTIMLESS', 'WANDERING', 'ANCHORING',
    'BUILDINGS', 'CERTAINLY', 'DESERVING', 'EXCLUDING', 'FURNISHED',
    'GROUNDING', 'HERODINGS', 'ISLANDERS', 'JUXTAPOSE', 'KINGFISHER',
    'LEVITAING', 'MISGUIDED', 'WONDERING', 'UPHOLDING', 'CARVINGS',
    'DREAMLIKE', 'FROSTBITE', 'NIGHTWARE', 'PUBLISHED', 'RECOGNISE',
    'SHOULDERS', 'THUMBSCRW', 'UNKINDEST', 'VOLUNTARY', 'WITHERING',
    'CUSTOMERS', 'FRAGMENTS', 'HANDWROTE', 'MICROWAVE', 'OUTSMARTED',
    'PLUNDERED', 'KEYSTONED', 'OBJECTING', 'RESHAPING', 'WORLDWIDE',
    'CLUSTERING', 'DIALOGUES', 'FRANCHISE', 'HORSEMINT', 'JAVELINS',
    'MARKETING', 'NEURALKIT', 'PROVIDING', 'SQUIRMED', 'TRANSFORM',
    'UPBRAIDED', 'VERBOSITY', 'WHETSTONE', 'YOUNGSTER', 'BADMINTON',
    'CLOBBERED', 'DYNAMITES', 'EXPECTING', 'FULCRTIPS', 'GEOMETRIC',
  ],
  he: [
    'מחשבונים', 'התלמידים', 'הספרייה', 'משחקיהם',
    'מתכוננים', 'השכנייה', 'הרכבתיה', 'תלבושות',
  ],
  sv: [
    'BOKSTAVER', 'DATORSPEL', 'FRIHANDIG', 'GRUNDKURS',
    'HUVUDSIDA', 'KLARGÖRAS', 'LANDSTING', 'MUSIKBAND',
  ],
  ja: [
    '新しい世界', '教育機関', '自然環境', '技術革新',
    '文化交流', '経済発展', '社会問題', '健康管理',
  ],
  es: [
    'RESPALDOS', 'CAMINANDO', 'DECORATIV', 'ENCONTRAR',
    'FABRICADO', 'GOBIERNO', 'HORMIGAS', 'INDOMABLE',
  ],
  fr: [],
  de: [],
  ru: [
    // All exactly 9 letters and present in russian_words.txt (the wheel uses
    // the source word's 9 letters; non-9-letter words break wheel generation).
    'СТРОИТЕЛИ', 'ПЕРЕВОДИТ', 'ФУНДАМЕНТ', 'ОПИСЫВАЕТ', 'ИСКУССТВО',
    'КОМПЬЮТЕР', 'ВОЛШЕБНИК', 'КАРТОФЕЛЬ', 'МУЗЫКАНТЫ', 'ПРИРОДНЫЙ',
  ],
};

// Kept only if every allowed center leaves enough dictionary words (en/es/ru 30, sv 20, ja 12).
export const WHEEL_V2_SOURCES: Record<Language, string[]> = {
  en: [
    'BREATHING', 'COUNTRIES', 'DANGEROUS', 'EDUCATION', 'FINGERTIP', 'GARDENING',
    'HARMONIZE', 'MACHINERY', 'OPERATING', 'REACTIONS', 'TRAMLINES', 'VOLCANISM',
    'WORSENING', 'EXPLORING', 'YEARNINGS', 'BLUNDERS', 'COMPANIES', 'DIRECTION',
    'EXPORTING', 'FLOWERING', 'GOVERNING', 'HORSEBACK', 'INVADERS', 'MOLECULES',
    'NUMBERING', 'OUTSCORED', 'PRACTICED', 'REMAINING', 'SURPRISED', 'THOUSANDS',
    'UNMASKING', 'WANDERING', 'ANCHORING', 'CERTAINLY', 'DESERVING', 'GROUNDING',
    'ISLANDERS', 'MISGUIDED', 'WONDERING', 'DREAMLIKE', 'FROSTBITE', 'RECOGNISE',
    'SHOULDERS', 'UNKINDEST', 'WITHERING', 'CUSTOMERS', 'HANDWROTE', 'OUTSMARTED',
    'PLUNDERED', 'KEYSTONED', 'RESHAPING', 'WORLDWIDE', 'CLUSTERING', 'DIALOGUES',
    'HORSEMINT', 'JAVELINS', 'MARKETING', 'SQUIRMED', 'TRANSFORM', 'UPBRAIDED',
    'VERBOSITY', 'WHETSTONE', 'YOUNGSTER', 'CLOBBERED', 'GEOMETRIC', 'PAINTERS',
    'TRAINERS', 'LANTERNS', 'MINERALS', 'MARINES', 'DIAMONDS', 'GARDENS',
    'SPRINTED', 'CHARIOTS', 'DOMESTIC', 'PLATINUM', 'MOUNTAINS', 'BLANKETS',
    'BOULDERS', 'SOLDIERS', 'STARLING', 'COLANDERS', 'LOBSTERS', 'PROTEINS',
    'STEALING', 'GRANDSON', 'SPEARMINT', 'TRIANGLE', 'RELATING', 'GRANITES',
    'ORIENTAL', 'RELATIONS', 'PLANETS', 'CANDLES', 'DETAINS', 'HAMSTER',
    'MONSTER', 'HOLIDAYS', 'PIRATES', 'SMOLDER', 'CAPTAINS', 'SPORTED',
    'DOCTRINE', 'MEADOWS', 'SANDPIPER', 'LIMESTONE', 'CORNFIELD', 'SCULPTED',
    'PANTHERS', 'TROUBLES', 'GLADIATOR', 'WINTERS', 'BLISTERED', 'TEACUPS',
    'SPECTRAL', 'PROMISED', 'GRAPHITE', 'BARTENDS', 'CLARINET', 'TANGLED',
    'MANTLES', 'SHIPMATE', 'FLOATERS', 'HOSPITAL', 'PARADISE', 'LEOPARDS',
    'PELICANS', 'CORDIALS', 'DISCOVER', 'STOMACH', 'MUSTARD', 'SECONDARY',
    'SCRAMBLED', 'SANDWICH', 'CHAMPIONS', 'SAILBOAT', 'STAPLER', 'SPRINGTIME',
    'GOLDFISH', 'OINTMENTS', 'CORIANDER', 'TENDRILS', 'MINDSET', 'HALIBUT',
    'STAMPEDE', 'PREDICTS', 'OUTLINED', 'PROBATE', 'CORNSTALK', 'DESPOTIC',
    'ROUNDEST', 'LAMPOONS', 'DINOSAUR', 'SUNLIGHT', 'TOMBSTONE', 'DISTANCE',
    'CAROUSEL', 'RECLAIMS', 'CLIENTS', 'DECIMALS', 'MARGINS', 'DETAILERS',
    'SORTIED', 'LOITERED', 'REALIGNS', 'TOENAILS', 'SPANIELS', 'SEDATION',
    'EMPORIUMS', 'TRAPEZOID', 'DECANTERS', 'HEARTLAND', 'WEALTHIER', 'OVERLAPS',
    'TRUMPETS', 'CRUSADE',
  ],
  he: LEGACY_WHEEL_SOURCES.he,
  sv: [
    'DATORSPEL', 'KLARGÖRAS', 'LANDSTING', 'KONSERT', 'KONTRAST', 'FÖNSTER',
    'GRÖNSAK', 'KLOSTER', 'OMKRETS', 'NEDSLAG', 'ASTRONOM', 'NEDERLAG',
    'GRANSKOG', 'SÖKMOTOR', 'GALLSTEN', 'SOLDATER', 'SPEGLAR', 'STJÄRNA',
    'SPRINGA', 'SÅNGERSKA', 'DROTTNING', 'RESTAURANG', 'STRANDEN', 'STORMEN',
    'PLANETER', 'DIAMANTER', 'KONSTNÄR', 'SOMMARTAL', 'BLIXTAR', 'SKRIVARE',
    'TISDAGEN', 'LÖRDAGEN', 'KASTRULL', 'PENSLAR', 'FRUKOSTEN', 'MIDDAGEN',
    'SALTVATTEN', 'RINGLADE', 'KRISTALL', 'STADION', 'VAKTMÄSTARE',
  ],
  // Hiragana: the dictionary and both validators are kana; kanji wheels held ~0 words of 3+ characters.
  ja: [
    'めんどうくさい', 'ごめんください', 'おかえりなさい', 'にあたりまして',
    'おやすみなさい', 'にわたりまして', 'もうしわけない', 'おてつだいさん',
    'そうりだいじん', 'おかけください', 'おまちください', 'どうぞよろしく',
    'おねがいします', 'そこはかとなく',
  ],
  es: [
    'RESPALDOS', 'CAMINANDO', 'ENCONTRAR', 'GOBIERNO', 'ESCRITOR', 'CORTINAS',
    'PLANETAS', 'DESTINO', 'CAMINOS', 'MARINOS', 'TORMENTAS', 'RELATOS',
    'PINTORES', 'ACTORES', 'NORTEADA', 'MONEDAS', 'ESTUDIAR', 'PLANTEO',
    'DORMIDAS', 'MERIENDA', 'PELOTAS', 'CEBOLLAS', 'PATINES', 'CAMISETA',
    'CUADERNO', 'CARACOLES', 'MOCHILA', 'LIBRETAS', 'PESCADO', 'MERCADO',
    'CANCIONES', 'SILENCIO', 'MARIPOSA', 'TORTUGAS', 'PERSIANA', 'DIAMANTES',
    'CAMPEON', 'PARTIDOS', 'OCTUBRE', 'DESAYUNO', 'ALMUERZO', 'ESTACION',
    'RATONES', 'CIRUELAS', 'PIMIENTA', 'TRAMPOLIN', 'LEOPARDO', 'PELICANO',
    'SERPIENTE', 'ESQUINAS', 'TEMPORADA', 'CIUDADES', 'LECTURAS', 'PINTURAS',
    'MOLINERA',
  ],
  fr: [],
  de: [],
  ru: [
    'СТРОИТЕЛИ', 'ПЕРЕВОДИТ', 'ФУНДАМЕНТ', 'ОПИСЫВАЕТ', 'ИСКУССТВО',
    'КАРТОФЕЛЬ', 'САМОЛЕТ', 'УЧИТЕЛЬ', 'ПОДАРКИ', 'ТАРЕЛКИ',
    'ПИСАТЕЛЬ', 'ОТКРЫТИЕ', 'ПРОДАВЕЦ', 'ЛЕСТНИЦА', 'ПОЛИТИКА',
    'КОМНАТЫ', 'ДЕВОЧКА', 'ПРАЗДНИК', 'ПОДРУГА', 'СТОЛИЦА',
    'ЗЕРКАЛО', 'ВИНОГРАД', 'КОРОЛЕВА', 'ДИРЕКТОР', 'ВОДИТЕЛЬ',
    'РОДИТЕЛИ', 'ПЯТНИЦА', 'ПОСТЕЛИ', 'КАРТИНЫ', 'ПОРТФЕЛЬ',
    'ПРОГУЛКА', 'ПЕСОЧНИЦА', 'МОРСКИЕ', 'САДОВНИК', 'ТРОПИНКА',
    'ЛАСТОЧКА', 'ПОЛЕТАЛИ', 'ЧЕРНИКА', 'КРАСОТЫ', 'ПЛАТОЧЕК',
    'ПЕРЧАТКИ', 'РАСТЕНИЕ', 'ПОВЕРНУТЬ', 'СПОРТИВНЫЙ', 'ЗАНЯТИЕ',
    'ПОЕЗДКА', 'ПИТОМЕЦ', 'ДОКТОРША', 'ЛИСТОПАД', 'СТРЕКОЗА',
    'ПЛАНЕТЫ', 'УЛИТКАМ',
  ],
};

// Q/J/X/Z for Latin alphabets plus the bottom of each dictionary's letter-frequency table.
export const HARD_CENTER_LETTERS: Partial<Record<Language, readonly string[]>> = {
  en: ['Q', 'J', 'X', 'Z'],
  sv: ['Q', 'J', 'X', 'Z', 'W', 'É', 'Ü'],
  es: ['Q', 'J', 'X', 'Z', 'Y', 'K', 'W'],
  ru: ['Ъ', 'Э', 'Ф', 'Ц', 'Щ'],
  ja: ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'っ', 'ゃ', 'ゅ', 'ょ', 'ゎ', 'ゔ', 'ぢ', 'づ', 'ぴ', 'ぺ', 'ぽ', 'ゑ', 'ゐ'],
};
