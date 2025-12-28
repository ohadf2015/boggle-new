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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-neo-navy dark:to-neo-navy-light p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-neo-navy-light rounded-neo border-4 border-neo-black p-6 mb-4 text-neo-black dark:text-neo-cream">
          <h1 className="text-3xl font-black mb-2">Daily Word Manager</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage target words for the daily Word Hunt challenge
          </p>
        </div>

        {/* Language Selector */}
        <div className="bg-white dark:bg-neo-navy-light rounded-neo border-4 border-neo-black p-4 mb-4 text-neo-black dark:text-neo-cream">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={cn(
                  'px-4 py-2 rounded-neo border-2 border-neo-black font-bold transition-all',
                  selectedLang === lang.code
                    ? 'bg-neo-purple text-white shadow-hard'
                    : 'bg-white dark:bg-gray-700 hover:shadow-hard'
                )}
              >
                {lang.flag} {lang.name} ({wordLists[lang.code].length})
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Stats Panel */}
          <div className="bg-white dark:bg-neo-navy-light rounded-neo border-4 border-neo-black p-4 text-neo-black dark:text-neo-cream">
            <h2 className="font-black text-xl mb-4">Statistics</h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Words:</span>
                <span className="font-bold">{stats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Shortest:</span>
                <span className="font-bold">{stats.shortest} letters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Longest:</span>
                <span className="font-bold">{stats.longest} letters</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              <h3 className="font-bold mb-2">By Length:</h3>
              <div className="space-y-1 text-sm">
                {Object.entries(stats.byLength)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([len, count]) => (
                    <div key={len} className="flex justify-between">
                      <span>{len} letters:</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {stats.shortest < 3 && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-600 dark:text-red-400">
                    <strong>Warning:</strong> Some words are shorter than 3 letters!
                  </div>
                </div>
              </div>
            )}

            {/* Export Actions */}
            <div className="mt-6 space-y-2">
              <Button
                onClick={handleExportCode}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy TypeScript Code'}
              </Button>
              <Button
                onClick={handleDownloadJSON}
                variant="outline"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
            </div>
          </div>

          {/* Word List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Add Word */}
            <div className="bg-white dark:bg-neo-navy-light rounded-neo border-4 border-neo-black p-4 text-neo-black dark:text-neo-cream">
              <h2 className="font-black text-xl mb-4">Add New Word</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddWord()}
                  placeholder="Enter word (3+ letters)"
                  className="flex-1 px-4 py-2 border-2 border-neo-black rounded-neo font-mono text-lg"
                />
                <Button onClick={handleAddWord} className="bg-neo-purple text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-neo-navy-light rounded-neo border-4 border-neo-black p-4 text-neo-black dark:text-neo-cream">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search words..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-neo-black rounded-neo"
                />
              </div>
            </div>

            {/* Words Grid */}
            <div className="bg-white dark:bg-neo-navy-light rounded-neo border-4 border-neo-black p-4 text-neo-black dark:text-neo-cream">
              <h2 className="font-black text-xl mb-4">
                Words ({filteredWords.length})
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[600px] overflow-y-auto">
                {filteredWords.map((word, idx) => (
                  <motion.div
                    key={word}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.01 }}
                    className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 group"
                  >
                    <span className="font-mono text-sm">{word}</span>
                    <button
                      onClick={() => handleRemoveWord(word)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </div>

              {filteredWords.length === 0 && (
                <div className="text-center py-12 text-gray-500">
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
