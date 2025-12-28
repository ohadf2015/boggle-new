'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertTriangle, Plus, Trash2, Copy, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

// Import word lists from dailyChallenge (we'll need to export them)
const INITIAL_WORD_LISTS: Record<Language, string[]> = {
  en: [
    'CAT', 'DOG', 'TREE', 'BIRD', 'FISH', 'MOON', 'STAR', 'RAIN', 'WIND', 'SNOW',
    'BOOK', 'DOOR', 'HAND', 'FOOT', 'HEAD', 'FACE', 'ROCK', 'SAND', 'BOAT', 'GAME',
    'HOUSE', 'PLANT', 'WATER', 'EARTH', 'SOUND', 'PLACE', 'WORLD', 'GREAT',
    'SMALL', 'LARGE', 'YOUNG', 'ROUND', 'CLEAR', 'LIGHT', 'DARK', 'FRESH',
    'CLEAN', 'QUICK', 'QUIET', 'HAPPY', 'READY', 'STRONG', 'SMART', 'BRAVE',
    'STONE', 'RIVER', 'OCEAN', 'CLOUD', 'STORM', 'FIELD', 'GRASS', 'BEACH',
    'CASTLE', 'GARDEN', 'FOREST', 'ISLAND', 'MARKET', 'BRIDGE', 'CORNER',
    'WINDOW', 'SIMPLE', 'MODERN', 'GOLDEN', 'SILVER', 'PURPLE', 'YELLOW',
    'ORANGE', 'SPRING', 'SUMMER', 'WINTER', 'AUTUMN', 'MONDAY', 'FRIDAY',
    'DRAGON', 'PLANET', 'NATURE', 'FLOWER', 'BUTTER', 'COFFEE', 'SUNSET',
    'KITCHEN', 'MORNING', 'EVENING', 'PERFECT', 'NATURAL', 'SPECIAL',
    'AMAZING', 'REGULAR', 'GENERAL', 'CENTRAL', 'EASTERN', 'WESTERN',
    'RAINBOW', 'THUNDER', 'CRYSTAL', 'DIAMOND', 'VANILLA', 'BLANKET',
    'MOUNTAIN', 'STANDARD', 'TREASURE', 'QUESTION', 'BUILDING', 'FUNCTION',
    'PEACEFUL', 'POWERFUL', 'BEAUTIFUL', 'WONDERFUL', 'FANTASTIC', 'ELEPHANT'
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

const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
];

export const DailyWordManager: React.FC = () => {
  const { t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<Language>('en');
  const [wordLists, setWordLists] = useState(INITIAL_WORD_LISTS);
  const [newWord, setNewWord] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const currentWords = wordLists[selectedLang];

  const filteredWords = useMemo(() => {
    if (!searchQuery) return currentWords;
    const query = searchQuery.toLowerCase();
    return currentWords.filter(word => word.toLowerCase().includes(query));
  }, [currentWords, searchQuery]);

  const stats = useMemo(() => {
    const lengths = currentWords.reduce((acc, word) => {
      const len = word.length;
      acc[len] = (acc[len] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      total: currentWords.length,
      byLength: lengths,
      shortest: Math.min(...currentWords.map(w => w.length)),
      longest: Math.max(...currentWords.map(w => w.length)),
    };
  }, [currentWords]);

  const handleAddWord = () => {
    const word = newWord.trim().toUpperCase();
    if (!word) return;

    if (word.length < 3) {
      alert('Words must be at least 3 letters!');
      return;
    }

    if (currentWords.includes(word)) {
      alert('Word already exists!');
      return;
    }

    setWordLists(prev => ({
      ...prev,
      [selectedLang]: [...prev[selectedLang], word].sort()
    }));
    setNewWord('');
  };

  const handleRemoveWord = (word: string) => {
    if (!confirm(`Remove "${word}"?`)) return;

    setWordLists(prev => ({
      ...prev,
      [selectedLang]: prev[selectedLang].filter(w => w !== word)
    }));
  };

  const handleExportCode = () => {
    const code = generateTypeScriptCode(wordLists);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const json = JSON.stringify(wordLists, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily-word-lists.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto">
        {/* Language Selector - Scrollable on mobile */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 mb-4 text-gray-900 dark:text-white">
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={cn(
                  'px-2.5 sm:px-4 py-2 rounded-lg border-2 font-bold transition-all flex-shrink-0 text-xs sm:text-sm min-h-[40px]',
                  selectedLang === lang.code
                    ? 'bg-purple-600 text-white border-purple-700 shadow-md'
                    : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:border-purple-400 text-gray-800 dark:text-gray-200'
                )}
              >
                <span className="mr-1">{lang.flag}</span>
                <span className="hidden xs:inline">{lang.name}</span>
                <span className="xs:hidden">{lang.code.toUpperCase()}</span>
                <span className="ml-1 opacity-70">({wordLists[lang.code].length})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Stats Panel - Collapsible on mobile */}
          <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-gray-900 dark:text-gray-100">
            <h2 className="font-bold text-lg sm:text-xl mb-3">Statistics</h2>

            <div className="grid grid-cols-3 gap-2 sm:block sm:space-y-3">
              <div className="text-center sm:text-left sm:flex sm:justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg sm:bg-transparent sm:p-0">
                <span className="block sm:inline text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total</span>
                <span className="block sm:inline font-bold text-lg sm:text-base">{stats.total}</span>
              </div>
              <div className="text-center sm:text-left sm:flex sm:justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg sm:bg-transparent sm:p-0">
                <span className="block sm:inline text-xs sm:text-sm text-gray-500 dark:text-gray-400">Shortest</span>
                <span className="block sm:inline font-bold text-lg sm:text-base">{stats.shortest}L</span>
              </div>
              <div className="text-center sm:text-left sm:flex sm:justify-between p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg sm:bg-transparent sm:p-0">
                <span className="block sm:inline text-xs sm:text-sm text-gray-500 dark:text-gray-400">Longest</span>
                <span className="block sm:inline font-bold text-lg sm:text-base">{stats.longest}L</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
              <h3 className="font-bold mb-2 text-sm">By Length:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-1 text-sm">
                {Object.entries(stats.byLength)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([len, count]) => (
                    <div key={len} className="flex justify-between px-2 py-1 bg-gray-50 dark:bg-slate-700/50 rounded">
                      <span className="text-gray-600 dark:text-gray-400">{len}L:</span>
                      <span className="font-mono font-bold">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {stats.shortest < 3 && (
              <div className="mt-4 p-2 sm:p-3 bg-red-100 dark:bg-red-900/30 border border-red-500 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                    <strong>Warning:</strong> Some words &lt;3 letters!
                  </div>
                </div>
              </div>
            )}

            {/* Export Actions */}
            <div className="mt-4 sm:mt-6 flex sm:flex-col gap-2">
              <Button
                onClick={handleExportCode}
                size="sm"
                className="flex-1 sm:w-full bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm"
              >
                {copied ? <Check className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> : <Copy className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />}
                {copied ? 'Copied!' : 'Copy TS'}
              </Button>
              <Button
                onClick={handleDownloadJSON}
                variant="outline"
                size="sm"
                className="flex-1 sm:w-full text-xs sm:text-sm"
              >
                <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                JSON
              </Button>
            </div>
          </div>

          {/* Word List */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {/* Add Word + Search Row */}
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 text-gray-900 dark:text-gray-100">
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Add Word Input */}
                <div className="flex gap-2 flex-1">
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddWord()}
                    placeholder="Add word (3+ letters)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg font-mono text-sm sm:text-base bg-white dark:bg-slate-700 min-w-0"
                  />
                  <Button onClick={handleAddWord} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0 min-h-[40px] min-w-[44px]">
                    <Plus className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Add</span>
                  </Button>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 sm:max-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Words Grid */}
            <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 text-gray-900 dark:text-gray-100">
              <h2 className="font-bold text-sm sm:text-base mb-3">
                Words <span className="text-gray-500">({filteredWords.length})</span>
              </h2>

              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 max-h-[50vh] sm:max-h-[600px] overflow-y-auto">
                {filteredWords.map((word, idx) => (
                  <motion.div
                    key={word}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.005, 0.2) }}
                    className="flex items-center justify-between p-1.5 sm:p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 group hover:border-red-300 dark:hover:border-red-500 transition-colors"
                  >
                    <span className="font-mono text-xs sm:text-sm truncate flex-1">{word}</span>
                    <button
                      onClick={() => handleRemoveWord(word)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 ml-1 flex-shrink-0 p-1"
                      aria-label={`Remove ${word}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </div>

              {filteredWords.length === 0 && (
                <div className="text-center py-8 sm:py-12 text-gray-500 dark:text-gray-400">
                  No words found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function generateTypeScriptCode(wordLists: Record<Language, string[]>): string {
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
