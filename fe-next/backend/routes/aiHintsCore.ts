/**
 * AI Hints Core Logic
 * Algorithmic hint generation, caching, language config, and fallback hints
 */

import { z } from 'zod';
import { ANY_LANGUAGE_WORD_PATTERN } from '@/shared/utils/wordNormalization';
// logger available if needed for future debugging

// Re-export AI enhancement module
export { getGeminiModel, generateAIEnhancedData } from './aiHintsAI';

export interface HintLevel {
  level: number;
  hint: string;
  unlockCost: number;
}

export interface HintGenerationResponse {
  hints: HintLevel[];
  category: string;
  exampleSentence: string;
  wordType?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  lettersToEliminate?: string[];
  tokenUsage?: { input: number; output: number };
}

export const LANGUAGE_CONFIG: Record<string, { name: string; vowels: string[]; alphabet: string }> = {
  en: { name: 'English', vowels: ['A', 'E', 'I', 'O', 'U'], alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  he: { name: 'Hebrew', vowels: ['א', 'ע', 'י', 'ו'], alphabet: 'אבגדהוזחטיכלמנסעפצקרשת' },
  sv: { name: 'Swedish', vowels: ['A', 'E', 'I', 'O', 'U', 'Y', 'Å', 'Ä', 'Ö'], alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ' },
  ja: { name: 'Japanese', vowels: ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'], alphabet: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん' },
  es: { name: 'Spanish', vowels: ['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú'], alphabet: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ' },
  ru: { name: 'Russian', vowels: ['А', 'Е', 'И', 'О', 'У', 'Ы', 'Э', 'Ю', 'Я'], alphabet: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' },
  fr: { name: 'French', vowels: ['A', 'E', 'I', 'O', 'U', 'Y', 'À', 'Â', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Ÿ'], alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  de: { name: 'German', vowels: ['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü'], alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß' },
};

const HINT_UNLOCK_COSTS = { LEVEL_1: 0, LEVEL_2: 4, LEVEL_3: 8, LEVEL_4: 12, LEVEL_5: 16 } as const;

export const generateHintsSchema = z.object({
  targetWord: z.string().min(2).max(20).regex(ANY_LANGUAGE_WORD_PATTERN),
  language: z.enum(['en', 'he', 'sv', 'ja', 'es', 'ru', 'fr', 'de']).default('en'),
});

// LRU Cache
interface CacheEntry {
  data: HintGenerationResponse;
  timestamp: number;
  accessCount: number;
}

const hintCache = new Map<string, CacheEntry>();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCacheKey(word: string, language: string): string {
  return `${language}:${word.toUpperCase()}`;
}

export function getFromCache(word: string, language: string): HintGenerationResponse | null {
  const key = getCacheKey(word, language);
  const entry = hintCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    hintCache.delete(key);
    return null;
  }
  entry.accessCount++;
  return entry.data;
}

export function setInCache(word: string, language: string, data: HintGenerationResponse): void {
  if (hintCache.size >= CACHE_MAX_SIZE) {
    let minKey: string | null = null;
    let minCount = Infinity;
    let minTime = Infinity;
    for (const [key, entry] of hintCache.entries()) {
      if (entry.accessCount < minCount || (entry.accessCount === minCount && entry.timestamp < minTime)) {
        minCount = entry.accessCount;
        minTime = entry.timestamp;
        minKey = key;
      }
    }
    if (minKey) hintCache.delete(minKey);
  }
  hintCache.set(getCacheKey(word, language), { data, timestamp: Date.now(), accessCount: 0 });
}

export function getCacheSize(): number {
  return hintCache.size;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hintCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) hintCache.delete(key);
  }
}, 60 * 60 * 1000);

// Algorithmic Hint Generation

function findVowelPositions(word: string, language: string): number[] {
  const vowelSet = new Set((LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en).vowels.map(v => v.toUpperCase()));
  const positions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (vowelSet.has(word[i].toUpperCase())) positions.push(i);
  }
  return positions;
}

function generateBlanksDisplay(word: string, revealPositions: number[]): string {
  return [...word].map((ch, i) => revealPositions.includes(i) ? ch.toUpperCase() : '_').join(' ');
}

function calculateRevealOrder(word: string, language: string): number[] {
  const vowelPositions = findVowelPositions(word, language);
  const vowelsFromEnd = [...vowelPositions].sort((a, b) => b - a);
  const consonantPositions = [...Array(word.length).keys()]
    .filter(i => !vowelPositions.includes(i))
    .sort((a, b) => b - a);
  return [...vowelsFromEnd, ...consonantPositions];
}

export function generateAlgorithmicHints(targetWord: string, language: string): HintLevel[] {
  const word = targetWord.toUpperCase();
  const wordLength = word.length;
  const maxReveal = Math.floor(wordLength / 2);
  const revealOrder = calculateRevealOrder(word, language);
  const vowelsFromEnd = [...findVowelPositions(word, language)].sort((a, b) => b - a);

  const hints: HintLevel[] = [
    { level: 1, hint: generateBlanksDisplay(word, []), unlockCost: HINT_UNLOCK_COSTS.LEVEL_1 },
    { level: 2, hint: generateBlanksDisplay(word, vowelsFromEnd.length > 0 ? [vowelsFromEnd[0]] : [wordLength - 1]), unlockCost: HINT_UNLOCK_COSTS.LEVEL_2 },
  ];

  if (wordLength >= 4) {
    const l3 = Math.min(Math.ceil(maxReveal * 0.5), revealOrder.length);
    hints.push({ level: 3, hint: generateBlanksDisplay(word, revealOrder.slice(0, l3).sort((a, b) => a - b)), unlockCost: HINT_UNLOCK_COSTS.LEVEL_3 });
    const l4 = Math.min(Math.ceil(maxReveal * 0.75), revealOrder.length);
    hints.push({ level: 4, hint: generateBlanksDisplay(word, revealOrder.slice(0, l4).sort((a, b) => a - b)), unlockCost: HINT_UNLOCK_COSTS.LEVEL_4 });
    hints.push({ level: 5, hint: generateBlanksDisplay(word, revealOrder.slice(0, maxReveal).sort((a, b) => a - b)), unlockCost: HINT_UNLOCK_COSTS.LEVEL_5 });
  }

  return hints;
}

// Fallback Hint Generation

const FALLBACK_TEMPLATES: Record<string, string[]> = {
  en: ['I saw a beautiful ____ today.', 'The ____ was quite impressive.', 'Have you ever seen such a ____?'],
  he: ['ראיתי ____ יפה היום.', 'ה____ היה מרשים מאוד.'],
  sv: ['Jag såg en vacker ____ idag.', '____ var mycket imponerande.'],
  ja: ['今日、美しい____を見ました。', 'その____はとても印象的でした。'],
  es: ['Hoy vi un hermoso ____.', 'El ____ era muy impresionante.'],
  fr: ["J'ai vu un beau ____ aujourd'hui.", 'Le ____ était très impressionnant.'],
  de: ['Ich habe heute einen schönen ____ gesehen.', 'Der ____ war sehr beeindruckend.'],
};

export function generateFallbackHints(targetWord: string, language: string = 'en'): HintGenerationResponse {
  const hints = generateAlgorithmicHints(targetWord, language);
  const templates = FALLBACK_TEMPLATES[language] || FALLBACK_TEMPLATES.en;
  return {
    hints,
    category: 'Unknown',
    exampleSentence: templates[Math.floor(Math.random() * templates.length)],
  };
}
