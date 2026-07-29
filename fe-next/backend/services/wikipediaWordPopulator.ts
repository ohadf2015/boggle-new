/**
 * Wikipedia Word Populator
 * Orchestrates fetching, validating, and storing Wikipedia-sourced words
 * Includes fallback to local JSON files and static word lists when Wikipedia is unavailable
 *
 * Admin operations: ./wikipediaWordAdmin.ts
 */

import type { Language } from '@/shared/types/game';
import path from 'path';
import fs from 'fs';
import {
  fetchFeaturedContent,
  fetchRandomArticles,
  extractWordsFromFeaturedContent,
  storeWikipediaWordCandidates
} from './wikipediaWordFetcher';
import {
  rankWordsByInterest,
  getRecentlyUsedWords,
  selectBestWord,
  validateWordWithAI,
  updateWordValidationStatus,
  validateGameWord,
  FORMAT_ONLY_FALLBACK_THRESHOLD
} from '@/utils/dailyChallenge/wikipediaWordProcessor';
import { importWikipediaWordsToBank } from '@/lib/dailyChallenge/wordBankService';
import { getSupabaseAdmin } from '@/lib/admin/server';
import logger from '../utils/logger';

// Re-export admin functions for backward compatibility
export {
  getWordCandidatesForAdmin,
  adminUpdateWordStatus,
  adminDeleteWordCandidate,
  adminAddWordCandidate,
} from './wikipediaWordAdmin';

// Re-export syncLocalJSONToDatabase with the loadWordsFromJSON dependency injected
export { syncLocalJSONToDatabase as _syncLocalJSONToDatabase } from './wikipediaWordAdmin';

const AUTO_PROMOTION_SCORE_THRESHOLD = 80;
export const AUTO_PROMOTION_THRESHOLD = AUTO_PROMOTION_SCORE_THRESHOLD;

/**
 * Log Wikipedia pipeline error with structured context
 */
function logPipelineError(
  operation: string,
  error: unknown,
  context: { word?: string; language?: Language; score?: number; candidateId?: string }
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error('WikiPopulator', `${operation} failed: ${errorMessage}`, {
    operation,
    error: errorMessage,
    ...context,
  });
}

// Fallback static word lists - curated interesting words (4+ letters)
const FALLBACK_WORD_LISTS: Record<Language, string[]> = {
  en: [
    'AURORA', 'ZENITH', 'NEBULA', 'QUARTZ', 'PRISM', 'GLACIER', 'PHOENIX', 'VORTEX',
    'COSMOS', 'EMBER', 'LUNAR', 'FLORA', 'FAUNA', 'CORAL', 'CRYSTAL', 'SUMMIT',
    'FJORD', 'HARBOR', 'MEADOW', 'TEMPLE', 'CASTLE', 'BRIDGE', 'CANYON', 'ISLAND',
    'LEGEND', 'VOYAGE', 'QUEST', 'REALM', 'CROWN', 'SHIELD', 'TOWER', 'THRONE',
    'STORM', 'FLAME', 'FROST', 'SPARK', 'BLAZE', 'THUNDER', 'BREEZE', 'TWILIGHT'
  ],
  he: [
    'אוקיינוס', 'קשת', 'שביט', 'אופק', 'מדבר', 'פסגה', 'מעיין', 'בזלת',
    'ענן', 'שמיים', 'אור', 'צל', 'ליל', 'בקר', 'ערב', 'עלות',
    'נהר', 'הר', 'עמק', 'גבעה', 'יער', 'שדה', 'חוף', 'מפל',
    'כוכב', 'ירח', 'שמש', 'כדור', 'חלל', 'גלקסיה', 'מסלול', 'מאדים'
  ],
  sv: [
    'AURORA', 'GALAX', 'METEOR', 'KOMET', 'NEBULOSA', 'FJORD', 'GLACIÄR', 'VULKAN',
    'SKOG', 'SJÖN', 'BERG', 'ÄLVA', 'DRAKE', 'RUNA', 'SAGA', 'MAGI',
    'STORM', 'BLIXTEN', 'DIMMA', 'FROST', 'SNÖFALL', 'REGN', 'VIND', 'MOLN',
    'SLOTT', 'TORN', 'PORT', 'BRON', 'HAMN', 'STAD', 'TORG', 'PARK'
  ],
  ja: [
    '銀河', '彗星', '流星', '惑星', '宇宙', '星雲', '日食', '月食',
    '富士', '桜', '紅葉', '雪山', '渓谷', '滝', '温泉', '庭園',
    '城', '神社', '寺院', '塔', '橋', '港', '島', '岬',
    '伝説', '神話', '英雄', '武士', '忍者', '侍', '龍', '鳳凰'
  ],
  es: [
    'AURORA', 'GALAXIA', 'COMETA', 'NEBULOSA', 'ECLIPSE', 'COSMOS', 'METEORO', 'LUNAR',
    'BOSQUE', 'SELVA', 'DESIERTO', 'VOLCÁN', 'GLACIAR', 'CASCADA', 'ARROYO', 'PRADO',
    'CASTILLO', 'TORRE', 'PUENTE', 'PUERTO', 'PLAZA', 'JARDÍN', 'PALACIO', 'TEMPLO',
    'LEYENDA', 'MISTERIO', 'TESORO', 'AVENTURA', 'VIAJE', 'HAZAÑA', 'GLORIA', 'HONOR'
  ],
  fr: [
    'AURORE', 'GALAXIE', 'COMÈTE', 'NÉBULEUSE', 'ÉCLIPSE', 'COSMOS', 'MÉTÉORE', 'LUNAIRE',
    'FORÊT', 'DÉSERT', 'GLACIER', 'VOLCAN', 'CASCADE', 'PRAIRIE', 'VALLÉE', 'COLLINE',
    'CHÂTEAU', 'TOUR', 'PONT', 'PORT', 'JARDIN', 'PALAIS', 'TEMPLE', 'CATHÉDRALE',
    'LÉGENDE', 'MYSTÈRE', 'TRÉSOR', 'VOYAGE', 'QUÊTE', 'GLOIRE', 'HONNEUR', 'DESTIN'
  ],
  de: [
    'AURORA', 'GALAXIE', 'KOMET', 'NEBEL', 'ECLIPSE', 'KOSMOS', 'METEOR', 'LUNAR',
    'WALD', 'WÜSTE', 'GLETSCHER', 'VULKAN', 'WASSERFALL', 'WIESE', 'TAL', 'HÜGEL',
    'SCHLOSS', 'TURM', 'BRÜCKE', 'HAFEN', 'GARTEN', 'PALAST', 'TEMPEL', 'KIRCHE',
    'LEGENDE', 'RÄTSEL', 'SCHATZ', 'REISE', 'SUCHE', 'RUHM', 'EHRE', 'SCHICKSAL'
  ]
};

interface WikipediaWordData {
  word: string;
  source: string;
  url?: string;
  score: number;
}

export interface PopulationResult {
  wordsFound: number;
  source: 'wikipedia' | 'local_json' | 'fallback';
  selectedWord?: string;
  candidates: Array<{ word: string; score: number; source: string; url?: string }>;
}

/**
 * Load Wikipedia words from local JSON file
 */
async function loadWordsFromJSON(
  language: Language
): Promise<Array<WikipediaWordData> | null> {
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'wikipedia-words', `${language}.json`);

    try { await fs.promises.access(jsonPath); } catch {
      logger.info('WikiPopulator', `No local JSON file found for ${language}`, { jsonPath });
      return null;
    }

    const fileContent = await fs.promises.readFile(jsonPath, 'utf-8');
    const data = JSON.parse(fileContent) as {
      language: string;
      lastUpdated: string;
      words: WikipediaWordData[];
    };

    logger.info('WikiPopulator', `Loaded ${data.words.length} words from local JSON for ${language}`, { lastUpdated: data.lastUpdated });
    return data.words;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WikiPopulator', `Error loading JSON file for ${language}`, { error: errorMessage });
    return null;
  }
}

/**
 * Wrapper for syncLocalJSONToDatabase that injects the loadWordsFromJSON dependency
 */
export async function syncLocalJSONToDatabase(
  language?: Language
): Promise<{ success: boolean; results: Record<string, { synced: number; error?: string }> }> {
  const { syncLocalJSONToDatabase: sync } = await import('./wikipediaWordAdmin');
  return sync(language, loadWordsFromJSON);
}

/**
 * Populate Wikipedia words for a specific language and date
 */
export async function populateWikipediaWords(
  date: Date,
  language: Language
): Promise<PopulationResult> {
  const dateStr = date.toISOString().split('T')[0];
  logger.info('WikiPopulator', `Starting population for ${language} on ${dateStr}`);

  const recentlyUsed = await getRecentlyUsedWords(language, 30);
  logger.info('WikiPopulator', `Found ${recentlyUsed.size} recently used words to avoid`);

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    logger.info('WikiPopulator', 'Production mode: trying local JSON first');
    const jsonResult = await tryLocalJSONSource(language, recentlyUsed, dateStr);
    if (jsonResult && jsonResult.candidates.length > 0) {
      return jsonResult;
    }
    logger.info('WikiPopulator', 'Local JSON unavailable, trying Wikipedia API');
  }

  const wikipediaResult = await tryWikipediaSource(date, language, recentlyUsed);

  if (wikipediaResult && wikipediaResult.candidates.length > 0) {
    await storeWikipediaWordCandidates(
      language, date,
      wikipediaResult.candidates.map(c => ({ word: c.word, source: c.source, url: c.url, score: c.score }))
    );

    const validatedCandidates = await validateTopCandidates(wikipediaResult.candidates, language, dateStr);

    if (validatedCandidates.length > 0) {
      const bestWord = selectBestWord(validatedCandidates, recentlyUsed);
      return {
        wordsFound: validatedCandidates.length,
        source: 'wikipedia',
        selectedWord: bestWord?.word,
        candidates: validatedCandidates
      };
    }
  }

  if (!isProduction) {
    logger.info('WikiPopulator', 'Development mode: Wikipedia failed, trying local JSON');
    const jsonResult = await tryLocalJSONSource(language, recentlyUsed, dateStr);
    if (jsonResult && jsonResult.candidates.length > 0) {
      return jsonResult;
    }
  }

  logger.info('WikiPopulator', `All sources failed, using static fallback for ${language}`);
  return getFallbackWords(language, recentlyUsed);
}

async function tryLocalJSONSource(
  language: Language,
  recentlyUsed: Set<string>,
  dateStr: string
): Promise<PopulationResult | null> {
  try {
    const jsonWords = await loadWordsFromJSON(language);
    if (!jsonWords || jsonWords.length === 0) return null;

    logger.info('WikiPopulator', `Processing ${jsonWords.length} words from local JSON`);

    const candidates = jsonWords
      .filter(w => !recentlyUsed.has(w.word))
      .map(w => ({ word: w.word, score: w.score, source: `${w.source}_json`, url: w.url }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    if (candidates.length === 0) {
      logger.info('WikiPopulator', 'All JSON words were recently used');
      return null;
    }

    await storeWikipediaWordCandidates(
      language, new Date(dateStr),
      candidates.map(c => ({ word: c.word, source: c.source, url: c.url, score: c.score }))
    );

    const validatedCandidates = await validateTopCandidates(candidates.slice(0, 10), language, dateStr);

    if (validatedCandidates.length > 0) {
      const bestWord = selectBestWord(validatedCandidates, recentlyUsed);
      return {
        wordsFound: validatedCandidates.length,
        source: 'local_json',
        selectedWord: bestWord?.word,
        candidates: validatedCandidates
      };
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WikiPopulator', `Error processing local JSON for ${language}`, { error: errorMessage });
    return null;
  }
}

async function tryWikipediaSource(
  date: Date,
  language: Language,
  _recentlyUsed: Set<string>
): Promise<{ candidates: Array<{ word: string; score: number; source: string; url?: string }> } | null> {
  try {
    const featuredContent = await fetchFeaturedContent(language, date);

    if (featuredContent) {
      const rawCandidates = extractWordsFromFeaturedContent(featuredContent, language);
      logger.info('WikiPopulator', `Extracted ${rawCandidates.length} raw candidates from featured content`);

      if (rawCandidates.length > 0) {
        const rankedCandidates = rankWordsByInterest(rawCandidates, language);
        logger.info('WikiPopulator', `Ranked ${rankedCandidates.length} valid candidates`);
        return { candidates: rankedCandidates };
      }
    }

    logger.info('WikiPopulator', `No featured content, trying random articles for ${language}`);
    const randomArticles = await fetchRandomArticles(language, 10);

    if (randomArticles.length > 0) {
      const rawCandidates = randomArticles
        .filter(a => a.title)
        .map(a => ({ word: a.title, source: 'random', url: a.content_urls?.desktop?.page }));

      const rankedCandidates = rankWordsByInterest(rawCandidates, language);
      logger.info('WikiPopulator', `Found ${rankedCandidates.length} candidates from random articles`);
      return { candidates: rankedCandidates };
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('WikiPopulator', `Wikipedia fetch error for ${language}`, { error: errorMessage });
    return null;
  }
}

async function isWordInDictionary(word: string, language: Language): Promise<boolean> {
  try {
    const { gameAIService } = await import('@/lib/ai-service');
    const result = await gameAIService.checkDatabaseOnly(word, language);
    return result.source === 'database' && result.isValid;
  } catch (error) {
    logger.warn('WikiPopulator', `Dictionary check failed for ${word}`, { error });
    return false;
  }
}

async function validateTopCandidates(
  candidates: Array<{ word: string; score: number; source: string; url?: string }>,
  language: Language,
  dateStr: string
): Promise<Array<{ word: string; score: number; source: string; url?: string }>> {
  const validated: Array<{ word: string; score: number; source: string; url?: string }> = [];
  const errors: Array<{ word: string; error: string }> = [];

  for (const candidate of candidates.slice(0, 10)) {
    try {
      const result = await validateWordWithAI(candidate.word, language, candidate.score);

      if (result.valid) {
        validated.push(candidate);
        await updateWordValidationStatus(language, candidate.word, dateStr, 'valid', candidate.score)
          .catch(err => logPipelineError('status-update', err, { word: candidate.word, language }));

        if (candidate.score >= AUTO_PROMOTION_SCORE_THRESHOLD) {
          const alreadyInDict = await isWordInDictionary(candidate.word, language);
          if (!alreadyInDict) {
            try {
              const { gameAIService } = await import('@/lib/ai-service');
              await gameAIService.validateAndSaveWord(candidate.word, language);
              logger.info('WikiPopulator', `Auto-promoted ${candidate.word} to dictionary`, { score: candidate.score });
            } catch (promoError) {
              logPipelineError('auto-promotion', promoError, { word: candidate.word, language, score: candidate.score });
            }
          } else {
            logger.info('WikiPopulator', `Word ${candidate.word} already in dictionary, skipping promotion`);
          }
        }
      } else {
        await updateWordValidationStatus(language, candidate.word, dateStr, 'invalid')
          .catch(err => logPipelineError('status-update', err, { word: candidate.word, language }));
      }
    } catch (error) {
      errors.push({ word: candidate.word, error: error instanceof Error ? error.message : 'Unknown error' });
      logPipelineError('validation', error, { word: candidate.word, language, score: candidate.score });

      if (candidate.score >= FORMAT_ONLY_FALLBACK_THRESHOLD) {
        const formatResult = validateGameWord(candidate.word, language);
        if (formatResult.valid) {
          validated.push(candidate);
          logger.info('WikiPopulator', `Added ${candidate.word} despite error (format valid, high score)`);
        }
      }
    }
  }

  if (errors.length > 0) {
    logger.warn('WikiPopulator', `${errors.length} candidates had errors`, {
      errors: errors.map(e => `${e.word}: ${e.error}`).join(', ')
    });
  }

  if (validated.length > 0) {
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const validWords = validated.map(c => c.word);
        const importResult = await importWikipediaWordsToBank(supabase, language, validWords);
        logger.info('WikiPopulator', `Auto-imported ${importResult.inserted} validated words to word bank`, {
          skipped: importResult.skipped, errors: importResult.errors
        });
      }
    } catch (importError) {
      logPipelineError('word-bank-import', importError, { language });
    }
  }

  return validated;
}

function getFallbackWords(
  language: Language,
  recentlyUsed: Set<string>
): PopulationResult {
  const fallbackList = FALLBACK_WORD_LISTS[language] || FALLBACK_WORD_LISTS.en;
  const availableWords = fallbackList.filter(word => !recentlyUsed.has(word));

  if (availableWords.length === 0) {
    logger.warn('WikiPopulator', `All fallback words for ${language} were recently used`);
    return {
      wordsFound: fallbackList.length,
      source: 'fallback',
      selectedWord: fallbackList[0],
      candidates: fallbackList.map((word, i) => ({ word, score: 50 - i, source: 'fallback' }))
    };
  }

  return {
    wordsFound: availableWords.length,
    source: 'fallback',
    selectedWord: availableWords[0],
    candidates: availableWords.map((word, i) => ({ word, score: 50 - i, source: 'fallback' }))
  };
}
