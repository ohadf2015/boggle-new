import type { Language } from '@/types';
import type { LanguageOption } from './types';

// Minimum word lengths per language (must match bulk-generate/route.ts)
export const MIN_WORD_LENGTH: Record<Language, number> = {
  en: 4,
  he: 3,
  sv: 3,
  ja: 2,
  es: 4,
  fr: 4,
  de: 4,
};

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
];

export const WORD_LISTS_STORAGE_KEY = 'admin-daily-word-lists';

// Word lists for daily challenge - English requires 4+ letters
export const INITIAL_WORD_LISTS: Record<Language, string[]> = {
  en: [
    // 4-letter words - interesting and unique (NO 3-letter words for English!)
    'LYNX', 'APEX', 'FLUX', 'VOID', 'ECHO', 'AURA', 'JADE', 'RUBY', 'ONYX', 'OPAL',
    'SWAN', 'HAWK', 'WOLF', 'BEAR', 'FROG', 'CRAB', 'SEAL', 'MOTH', 'WASP', 'CROW',
    'TREE', 'BIRD', 'FISH', 'MOON', 'STAR', 'RAIN', 'WIND', 'SNOW', 'BOOK', 'DOOR',
    'HAND', 'FOOT', 'HEAD', 'FACE', 'ROCK', 'SAND', 'BOAT', 'GAME', 'GLOW', 'BEAM',
    'DARK', 'BLUR', 'MIST', 'HAZE', 'DUSK', 'DAWN', 'GUST', 'BOLT', 'SURF', 'WAND',
    // 5-letter words
    'HOUSE', 'PLANT', 'WATER', 'EARTH', 'SOUND', 'PLACE', 'WORLD', 'GREAT',
    'SMALL', 'LARGE', 'YOUNG', 'ROUND', 'CLEAR', 'LIGHT', 'FRESH', 'BLAZE',
    'FROST', 'STORM', 'FLAME', 'SPARK', 'FLASH', 'GLEAM', 'SHADE', 'GHOST',
    'CLEAN', 'QUICK', 'QUIET', 'HAPPY', 'READY', 'BRAVE', 'SMART', 'STONE',
    'RIVER', 'OCEAN', 'CLOUD', 'FIELD', 'GRASS', 'BEACH', 'REALM', 'TOWER',
    'CROWN', 'SWORD', 'BLADE', 'ARROW', 'SPEAR', 'QUEST', 'MAGIC', 'SPELL',
    // 6-letter words
    'CASTLE', 'GARDEN', 'FOREST', 'ISLAND', 'MARKET', 'BRIDGE', 'CORNER',
    'WINDOW', 'SIMPLE', 'MODERN', 'GOLDEN', 'SILVER', 'PURPLE', 'YELLOW',
    'ORANGE', 'SPRING', 'SUMMER', 'WINTER', 'AUTUMN', 'DRAGON', 'PLANET',
    'NATURE', 'FLOWER', 'BUTTER', 'COFFEE', 'SUNSET', 'AURORA', 'NEBULA',
    'COSMOS', 'GALAXY', 'MYSTIC', 'WIZARD', 'KNIGHT', 'PRINCE', 'PALACE',
    // 7-letter words
    'KITCHEN', 'MORNING', 'EVENING', 'PERFECT', 'NATURAL', 'SPECIAL',
    'AMAZING', 'REGULAR', 'GENERAL', 'CENTRAL', 'EASTERN', 'WESTERN',
    'RAINBOW', 'THUNDER', 'CRYSTAL', 'DIAMOND', 'VANILLA', 'BLANKET',
    'ECLIPSE', 'HORIZON', 'TEMPEST', 'PHANTOM', 'WARRIOR', 'EMERALD',
    // 8-letter words
    'MOUNTAIN', 'STANDARD', 'TREASURE', 'QUESTION', 'BUILDING', 'FUNCTION',
    'PEACEFUL', 'POWERFUL', 'TWILIGHT', 'MIDNIGHT', 'GUARDIAN', 'CHAMPION',
    'SENTINEL', 'WANDERER', 'EXPLORER', 'AMETHYST', 'SPECTRUM', 'MAJESTIC'
  ],
  he: [
    'בית', 'מים', 'עולם', 'אדם', 'דבר', 'עין', 'ראש', 'ילד', 'ספר', 'שלום',
    'חבר', 'דלת', 'חלון', 'שולחן', 'כיסא', 'שמש', 'ירח', 'כוכב', 'עץ', 'פרח',
    'סוס', 'כלב', 'חתול', 'ציפור', 'דג', 'משפחה', 'חברה', 'עבודה', 'תרבות',
    'אהבה', 'שמחה', 'תקווה', 'חופש', 'חינוך', 'בריאות', 'תקשורת', 'מדינה', 'ממשלה'
  ],
  sv: [
    'HUS', 'DAG', 'ÖGA', 'ÖRA', 'ARM', 'BEN', 'BOK', 'BIL', 'SOL', 'VÄG',
    'VATTEN', 'VÄRLD', 'PLATS', 'LJUD', 'KRAFT', 'BÄSTA', 'FÖRSTA', 'SISTA', 'RUNDA', 'KLAR',
    'STEN', 'HUND', 'KATT', 'FÅGEL', 'BLOM', 'SLOTT', 'TRÄDGÅRD', 'MARKNAD', 'FÖNSTER',
    'NATUR', 'HIMMEL', 'VINTER', 'SOMMAR', 'MORGON', 'KVÄLL', 'PERFEKT', 'FANTASTISK'
  ],
  ja: [
    '日本', '東京', '学校', '先生', '学生', '友達', '家族', '会社', '仕事', '時間',
    '天気', '音楽', '映画', '料理', '旅行', '電車', '新聞', '本', '犬', '猫',
    '花', '木', '山', '川', '海', '日本語', '図書館', '大学', '病院', '空港',
    '公園', '駅', '銀行', '郵便局', '美術館'
  ],
  es: [
    'SOL', 'MAR', 'PAN', 'SAL', 'LUZ', 'VOZ', 'PAZ', 'REY', 'LEY', 'RÍO',
    'CASA', 'AGUA', 'VIDA', 'AMOR', 'MESA', 'LIBRO', 'PERRO', 'GATO',
    'MUNDO', 'LUGAR', 'TIEMPO', 'GENTE', 'NOCHE', 'PLANTA', 'TIERRA', 'CIELO', 'FIESTA', 'AMIGO',
    'CASTILLO', 'JARDÍN', 'MERCADO', 'PUENTE', 'VENTANA', 'SIMPLE', 'MODERNO', 'DORADO',
    'COCINA', 'MAÑANA', 'PERFECTO', 'NATURAL', 'FANTÁSTICO'
  ],
  fr: [
    'CHAT', 'PAIN', 'LUNE', 'ÉTOILE', 'ARBRE', 'FLEUR', 'JOUR', 'NUIT',
    'MAISON', 'MONDE', 'TEMPS', 'VILLE', 'GRAND', 'PETIT', 'BELLE', 'FORCE', 'PLACE', 'CHOSE',
    'LIVRE', 'CHIEN', 'AMOUR', 'JOLIE', 'RÊVE', 'JARDIN', 'SOLEIL', 'NATURE', 'MONTAGNE', 'RIVIÈRE'
  ],
  de: [
    'HAUS', 'BAUM', 'BUCH', 'HUND', 'KATZE', 'SONNE', 'MOND', 'STERN',
    'WELT', 'ZEIT', 'STADT', 'GROSS', 'KLEIN', 'KRAFT', 'PLATZ', 'SACHE', 'WASSER', 'LIEBE',
    'GARTEN', 'FENSTER', 'NATUR', 'HIMMEL', 'SOMMER'
  ]
};

export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function generateTypeScriptCode(wordLists: Record<Language, string[]>): string {
  const lines: string[] = [
    'const TARGET_WORD_LISTS: Record<Language, string[]> = {',
  ];

  for (const [lang, words] of Object.entries(wordLists)) {
    lines.push(`  ${lang}: [`);

    // Group by length
    const byLength = words.reduce((acc, word) => {
      const len = word.length;
      if (!acc[len]) acc[len] = [];
      acc[len].push(word);
      return acc;
    }, {} as Record<number, string[]>);

    Object.entries(byLength)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([len, wordGroup], idx) => {
        lines.push(`    // ${len}-letter words`);
        lines.push(`    ${wordGroup.map(w => `'${w}'`).join(', ')}${idx < Object.keys(byLength).length - 1 ? ',' : ''}`);
      });

    lines.push('  ],');
  }

  lines.push('};');
  return lines.join('\n');
}
