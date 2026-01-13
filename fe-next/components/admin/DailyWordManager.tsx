'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertTriangle, Plus, Trash2, Copy, Download, Check, Sparkles, Calendar, Save, RefreshCw, RotateCcw, Edit, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import type { Language } from '@/types';

// Minimum word lengths per language (must match bulk-generate/route.ts)
const MIN_WORD_LENGTH: Record<Language, number> = {
  en: 4,
  he: 3,
  sv: 3,
  ja: 2,
  es: 4,
  fr: 4,
  de: 4,
};

// Word lists for daily challenge - English requires 4+ letters
const INITIAL_WORD_LISTS: Record<Language, string[]> = {
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

const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
];

interface BulkGeneratedWord {
  date: string;
  word: string;
  reason: string;
}

interface DailyTargetWord {
  id: string;
  puzzle_date: string;
  target_word: string;
  override_word?: string;
  ai_selected: boolean;
  ai_reason?: string;
  language: string;
}

interface BulkGenerateState {
  isLoading: boolean;
  generatedWords: BulkGeneratedWord[];
  existingWords: Array<{ date: string; word: string }>;
  excludedWords: string[];
  aiConfigured: boolean;
  stats: {
    totalDates: number;
    existingDates: number;
    generatedDates: number;
    excludedWordsCount: number;
  } | null;
  error: string | null;
}

const WORD_LISTS_STORAGE_KEY = 'admin-daily-word-lists';

// Load word lists from localStorage, falling back to initial lists
function loadWordLists(): Record<Language, string[]> {
  if (typeof window === 'undefined') return INITIAL_WORD_LISTS;

  try {
    const stored = localStorage.getItem(WORD_LISTS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with initial lists to ensure all languages are present
      return {
        ...INITIAL_WORD_LISTS,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to load word lists from localStorage:', e);
  }
  return INITIAL_WORD_LISTS;
}

// Save word lists to localStorage
function saveWordLists(lists: Record<Language, string[]>) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(WORD_LISTS_STORAGE_KEY, JSON.stringify(lists));
  } catch (e) {
    console.error('Failed to save word lists to localStorage:', e);
  }
}

export const DailyWordManager: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<Language>('en');
  const [wordLists, setWordLists] = useState<Record<Language, string[]>>(INITIAL_WORD_LISTS);
  const [newWord, setNewWord] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load word lists from localStorage on mount
  useEffect(() => {
    const loaded = loadWordLists();
    setWordLists(loaded);
    setIsLoaded(true);
  }, []);

  // Save word lists to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveWordLists(wordLists);
    }
  }, [wordLists, isLoaded]);

  // Fetch access token on mount
  useEffect(() => {
    const fetchToken = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }
    };
    fetchToken();
  }, []);

  // Bulk generation state
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [bulkEndDate, setBulkEndDate] = useState(() => {
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    return weekLater.toISOString().split('T')[0];
  });
  const [bulkState, setBulkState] = useState<BulkGenerateState>({
    isLoading: false,
    generatedWords: [],
    existingWords: [],
    excludedWords: [],
    aiConfigured: true, // Assume true until we know otherwise
    stats: null,
    error: null,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Schedule Management
  const [schedule, setSchedule] = useState<DailyTargetWord[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editWordValue, setEditWordValue] = useState('');

  const fetchSchedule = useCallback(async () => {
    if (!accessToken) return;
    setLoadingSchedule(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() - 5); 
      const end = new Date();
      end.setDate(end.getDate() + 35);

      const params = new URLSearchParams({
        language: selectedLang,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });

      const res = await fetch(`/api/admin/daily-word/schedule?${params}`, {
         headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.data) {
        setSchedule(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSchedule(false);
    }
  }, [accessToken, selectedLang]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleEditWord = (date: string, currentWord: string) => {
    setEditingDate(date);
    setEditWordValue(currentWord);
  };

  const handleSaveSingleWord = async (date: string) => {
    if (!accessToken || !editWordValue.trim()) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/daily-word/bulk-generate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          language: selectedLang,
          words: [{ date, word: editWordValue.trim() }],
        }),
      });

      if (!response.ok) throw new Error('Failed to update');
      
      await fetchSchedule();
      setEditingDate(null);
      setEditWordValue('');
    } catch (e) {
      alert('Error updating word');
    } finally {
      setIsSaving(false);
    }
  };

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

    const minLength = MIN_WORD_LENGTH[selectedLang] || 3;
    if (word.length < minLength) {
      alert(`Words for ${selectedLang.toUpperCase()} must be at least ${minLength} letters!`);
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

  const handleResetToDefaults = () => {
    if (!confirm('Reset all word lists to defaults? This will clear your custom changes.')) return;
    setWordLists(INITIAL_WORD_LISTS);
    localStorage.removeItem(WORD_LISTS_STORAGE_KEY);
  };

  // Bulk generation handlers
  const handleBulkGenerate = useCallback(async () => {
    if (!accessToken) {
      setBulkState(prev => ({ ...prev, error: 'Not authenticated. Please refresh the page.' }));
      return;
    }

    setBulkState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/admin/daily-word/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          language: selectedLang,
          startDate: bulkStartDate,
          endDate: bulkEndDate,
          existingWords: currentWords, // Pass current word list for reference
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate words');
      }

      setBulkState({
        isLoading: false,
        generatedWords: data.generatedWords || [],
        existingWords: data.existingWords || [],
        excludedWords: data.excludedWords || [],
        aiConfigured: data.aiConfigured ?? true,
        stats: data.stats || null,
        error: null,
      });
    } catch (error) {
      setBulkState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [selectedLang, bulkStartDate, bulkEndDate, currentWords, accessToken]);

  const handleBulkWordChange = useCallback((index: number, newWord: string) => {
    setBulkState(prev => ({
      ...prev,
      generatedWords: prev.generatedWords.map((item, i) =>
        i === index ? { ...item, word: newWord.toUpperCase() } : item
      ),
    }));
  }, []);

  const handleBulkSave = useCallback(async () => {
    if (!accessToken) {
      alert('Not authenticated. Please refresh the page.');
      return;
    }

    const wordsToSave = bulkState.generatedWords
      .filter(w => w.word.trim().length > 0)
      .map(w => ({ date: w.date, word: w.word }));

    if (wordsToSave.length === 0) {
      alert('No words to save. Please fill in at least one word.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/daily-word/bulk-generate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          language: selectedLang,
          words: wordsToSave,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save words');
      }

      alert(`Saved ${data.summary.created} new and ${data.summary.updated} updated words${data.summary.errors > 0 ? ` (${data.summary.errors} errors)` : ''}`);

      // Clear the generated words
      setBulkState(prev => ({
        ...prev,
        generatedWords: [],
        existingWords: [],
        stats: null,
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [bulkState.generatedWords, selectedLang, accessToken]);

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

        {/* Schedule Manager Section */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 mb-4 text-gray-900 dark:text-white">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-base sm:text-lg">Daily Schedule</h3>
             </div>
             <Button size="sm" variant="outline" onClick={fetchSchedule} disabled={loadingSchedule}>
               {loadingSchedule ? (
                 <NeoLoader variant="dots" size="sm" />
               ) : (
                 <RefreshCw className="w-4 h-4" />
               )}
             </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2">
            {schedule.map(item => {
               const dateObj = new Date(item.puzzle_date);
               const isToday = new Date().toISOString().split('T')[0] === item.puzzle_date;
               const isPast = dateObj < new Date(new Date().setHours(0,0,0,0)) && !isToday;
               const activeWord = item.override_word || item.target_word;
               const isEditing = editingDate === item.puzzle_date;

               return (
                 <div key={item.id} className={cn(
                   "p-3 rounded-lg border flex flex-col gap-2 relative",
                   isToday ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : 
                   isPast ? "border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800 opacity-60" :
                   "border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-700"
                 )}>
                    <div className="flex justify-between items-start">
                      <span className={cn("text-xs font-mono", isToday && "font-bold text-purple-700 dark:text-purple-300")}>
                        {formatDateDisplay(item.puzzle_date)}
                      </span>
                      {item.override_word && (
                         <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full" title="Manually overridden">
                           Manual
                         </span>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="flex gap-1">
                        <input 
                          autoFocus
                          className="w-full text-sm px-1 py-1 border rounded uppercase font-mono bg-white text-black"
                          value={editWordValue}
                          onChange={e => setEditWordValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveSingleWord(item.puzzle_date);
                            if (e.key === 'Escape') setEditingDate(null);
                          }}
                        />
                        <button onClick={() => handleSaveSingleWord(item.puzzle_date)} className="p-1 text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingDate(null)} className="p-1 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center group min-h-[28px]">
                         <span className="font-bold font-mono text-lg">{activeWord}</span>
                         <button 
                           onClick={() => handleEditWord(item.puzzle_date, activeWord)}
                           className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-gray-500"
                           title="Edit word"
                         >
                           <Edit className="w-4 h-4" />
                         </button>
                      </div>
                    )}
                    
                    {item.ai_reason && !item.override_word && (
                      <p className="text-[10px] text-gray-400 truncate" title={item.ai_reason}>{item.ai_reason}</p>
                    )}
                 </div>
               );
            })}
             {schedule.length === 0 && !loadingSchedule && (
                <div className="col-span-full text-center py-8 text-gray-500">
                    No words scheduled. Use the Bulk Generator below.
                </div>
             )}
          </div>
        </div>

        {/* AI Bulk Generator Section */}
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 mb-4 text-gray-900 dark:text-white">
          <button
            onClick={() => setShowBulkGenerator(!showBulkGenerator)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span className="font-bold text-base sm:text-lg">AI Bulk Word Generator</span>
            </div>
            <span className="text-sm text-gray-500">{showBulkGenerator ? '▼' : '▶'}</span>
          </button>

          {showBulkGenerator && (
            <div className="mt-4 space-y-4">
              {/* Date Range Selection */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleBulkGenerate}
                    disabled={bulkState.isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white min-h-[42px]"
                  >
                    {bulkState.isLoading ? (
                      <>
                        <span className="mr-2"><NeoLoader variant="dots" size="sm" /></span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Error Display */}
              {bulkState.error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-500 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  {bulkState.error}
                </div>
              )}

              {/* AI Not Configured Warning */}
              {!bulkState.aiConfigured && bulkState.stats && (
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500 rounded-lg text-yellow-700 dark:text-yellow-400 text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  <strong>AI not configured:</strong> GEMINI_API_KEY environment variable is not set. Words must be entered manually.
                </div>
              )}

              {/* Stats Display */}
              {bulkState.stats && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                  <div className="flex flex-wrap gap-4 text-blue-800 dark:text-blue-300">
                    <span>Total dates: <strong>{bulkState.stats.totalDates}</strong></span>
                    <span>Already scheduled: <strong>{bulkState.stats.existingDates}</strong></span>
                    <span>To generate: <strong>{bulkState.stats.generatedDates}</strong></span>
                    <span>Excluded words (30-day): <strong>{bulkState.stats.excludedWordsCount}</strong></span>
                  </div>
                </div>
              )}

              {/* Existing Words Display */}
              {bulkState.existingWords.length > 0 && (
                <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 text-gray-600 dark:text-gray-400">Already Scheduled:</h4>
                  <div className="flex flex-wrap gap-2">
                    {bulkState.existingWords.map((item) => (
                      <span
                        key={item.date}
                        className="px-2 py-1 bg-gray-200 dark:bg-slate-600 rounded text-xs font-mono"
                      >
                        {formatDateDisplay(item.date)}: <strong>{item.word}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Words Editor */}
              {bulkState.generatedWords.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                    AI Generated Words (edit before saving):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {bulkState.generatedWords.map((item, index) => (
                      <div
                        key={item.date}
                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600"
                      >
                        <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 w-20">
                          {formatDateDisplay(item.date)}
                        </div>
                        <input
                          type="text"
                          value={item.word}
                          onChange={(e) => handleBulkWordChange(index, e.target.value)}
                          placeholder="Enter word"
                          className={cn(
                            "flex-1 px-2 py-1 border rounded font-mono text-sm uppercase min-w-0",
                            "bg-white dark:bg-slate-600 border-gray-300 dark:border-slate-500",
                            !item.word && "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
                          )}
                          maxLength={selectedLang === 'ja' ? 4 : 8}
                        />
                        {item.reason && (
                          <span className="flex-shrink-0 text-xs text-gray-400 truncate max-w-[80px]" title={item.reason}>
                            {item.reason.length > 15 ? item.reason.slice(0, 15) + '...' : item.reason}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Save and Regenerate Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleBulkSave}
                      disabled={isSaving || bulkState.generatedWords.every(w => !w.word.trim())}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isSaving ? (
                        <>
                          <span className="mr-2"><NeoLoader variant="dots" size="sm" /></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save All Words
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleBulkGenerate}
                      disabled={bulkState.isLoading}
                      variant="outline"
                      className="border-purple-400 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}

              {/* Excluded Words Info */}
              {bulkState.excludedWords.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    Show excluded words (used within 30 days)
                  </summary>
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded text-xs font-mono text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
                    {bulkState.excludedWords.join(', ')}
                  </div>
                </details>
              )}
            </div>
          )}
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
              <Button
                onClick={handleResetToDefaults}
                variant="outline"
                size="sm"
                className="flex-1 sm:w-full text-xs sm:text-sm text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/20"
              >
                <RotateCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Reset
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
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
