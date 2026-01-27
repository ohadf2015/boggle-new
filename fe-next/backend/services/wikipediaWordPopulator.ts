/**
 * Wikipedia Word Populator
 * Orchestrates fetching, validating, and storing Wikipedia-sourced words
 * Includes fallback to local JSON files and static word lists when Wikipedia is unavailable
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

// Minimum score threshold for auto-promotion to dictionary
// Words >= this score that pass AI validation are automatically added to community_words
const AUTO_PROMOTION_SCORE_THRESHOLD = 80;

/**
 * Log Wikipedia pipeline error with structured context
 * Provides consistent error logging throughout the pipeline
 */
function logPipelineError(
  operation: string,
  error: unknown,
  context: {
    word?: string;
    language?: Language;
    score?: number;
    candidateId?: string;
  }
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const contextStr = JSON.stringify(context);

  console.error(`[WikiPopulator] ${operation} failed: ${errorMessage}`, {
    operation,
    error: errorMessage,
    ...context,
    timestamp: new Date().toISOString()
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

/**
 * Wikipedia word data structure from JSON files
 */
interface WikipediaWordData {
  word: string;
  source: string;
  url?: string;
  score: number;
}

/**
 * Result of word population
 */
export interface PopulationResult {
  wordsFound: number;
  source: 'wikipedia' | 'local_json' | 'fallback';
  selectedWord?: string;
  candidates: Array<{ word: string; score: number; source: string; url?: string }>;
}

/**
 * Load Wikipedia words from local JSON file
 * These files contain pre-validated words from Wikipedia for reliable fallback
 *
 * @param language - Language code
 * @returns Array of word candidates with metadata, or null if file not found
 */
async function loadWordsFromJSON(
  language: Language
): Promise<Array<WikipediaWordData> | null> {
  try {
    // Path to JSON file in data/wikipedia-words/
    const jsonPath = path.join(process.cwd(), 'data', 'wikipedia-words', `${language}.json`);

    // Check if file exists
    if (!fs.existsSync(jsonPath)) {
      console.log(`[WikiPopulator] No local JSON file found for ${language} at ${jsonPath}`);
      return null;
    }

    // Read and parse JSON file
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(fileContent) as {
      language: string;
      lastUpdated: string;
      words: WikipediaWordData[];
    };

    console.log(`[WikiPopulator] Loaded ${data.words.length} words from local JSON for ${language} (updated: ${data.lastUpdated})`);

    return data.words;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[WikiPopulator] Error loading JSON file for ${language}:`, errorMessage);
    return null;
  }
}

/**
 * Populate Wikipedia words for a specific language and date
 * Strategy:
 * - Production: Local JSON → Wikipedia API → Fallback lists
 * - Development: Wikipedia API → Local JSON → Fallback lists
 *
 * @param date - Date to populate words for
 * @param language - Language code
 * @returns Population result with words found
 */
export async function populateWikipediaWords(
  date: Date,
  language: Language
): Promise<PopulationResult> {
  const dateStr = date.toISOString().split('T')[0];
  console.log(`[WikiPopulator] Starting population for ${language} on ${dateStr}`);

  // Get recently used words to avoid repetition
  const recentlyUsed = await getRecentlyUsedWords(language, 30);
  console.log(`[WikiPopulator] Found ${recentlyUsed.size} recently used words to avoid`);

  const isProduction = process.env.NODE_ENV === 'production';

  // Production: Try local JSON first (reliable, fast)
  if (isProduction) {
    console.log(`[WikiPopulator] Production mode: trying local JSON first`);
    const jsonResult = await tryLocalJSONSource(language, recentlyUsed, dateStr);

    if (jsonResult && jsonResult.candidates.length > 0) {
      return jsonResult;
    }

    console.log(`[WikiPopulator] Local JSON unavailable, trying Wikipedia API`);
  }

  // Try Wikipedia API (both dev and production)
  const wikipediaResult = await tryWikipediaSource(date, language, recentlyUsed);

  if (wikipediaResult && wikipediaResult.candidates.length > 0) {
    // Store candidates in database
    await storeWikipediaWordCandidates(
      language,
      date,
      wikipediaResult.candidates.map(c => ({
        word: c.word,
        source: c.source,
        url: c.url,
        score: c.score
      }))
    );

    // Validate top candidates with AI
    const validatedCandidates = await validateTopCandidates(
      wikipediaResult.candidates,
      language,
      dateStr
    );

    if (validatedCandidates.length > 0) {
      const bestWord = selectBestWord(
        validatedCandidates,
        recentlyUsed
      );

      return {
        wordsFound: validatedCandidates.length,
        source: 'wikipedia',
        selectedWord: bestWord?.word,
        candidates: validatedCandidates
      };
    }
  }

  // Development: Try local JSON as fallback before static lists
  if (!isProduction) {
    console.log(`[WikiPopulator] Development mode: Wikipedia failed, trying local JSON`);
    const jsonResult = await tryLocalJSONSource(language, recentlyUsed, dateStr);

    if (jsonResult && jsonResult.candidates.length > 0) {
      return jsonResult;
    }
  }

  // Final fallback to static word lists
  console.log(`[WikiPopulator] All sources failed, using static fallback for ${language}`);
  return getFallbackWords(language, recentlyUsed);
}

/**
 * Try to load words from local JSON file
 */
async function tryLocalJSONSource(
  language: Language,
  recentlyUsed: Set<string>,
  dateStr: string
): Promise<PopulationResult | null> {
  try {
    const jsonWords = await loadWordsFromJSON(language);

    if (!jsonWords || jsonWords.length === 0) {
      return null;
    }

    console.log(`[WikiPopulator] Processing ${jsonWords.length} words from local JSON`);

    // Convert JSON words to candidate format
    const candidates = jsonWords
      .filter(w => !recentlyUsed.has(w.word))
      .map(w => ({
        word: w.word,
        score: w.score,
        source: `${w.source}_json`,
        url: w.url
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50); // Top 50 candidates

    if (candidates.length === 0) {
      console.log(`[WikiPopulator] All JSON words were recently used`);
      return null;
    }

    // Store in database for tracking
    await storeWikipediaWordCandidates(
      language,
      new Date(dateStr),
      candidates.map(c => ({
        word: c.word,
        source: c.source,
        url: c.url,
        score: c.score
      }))
    );

    // Validate top candidates (limit to avoid excessive AI calls)
    const validatedCandidates = await validateTopCandidates(
      candidates.slice(0, 10),
      language,
      dateStr
    );

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
    console.error(`[WikiPopulator] Error processing local JSON for ${language}:`, errorMessage);
    return null;
  }
}

/**
 * Try to fetch words from Wikipedia
 */
async function tryWikipediaSource(
  date: Date,
  language: Language,
  recentlyUsed: Set<string>
): Promise<{ candidates: Array<{ word: string; score: number; source: string; url?: string }> } | null> {
  try {
    // Fetch featured content
    const featuredContent = await fetchFeaturedContent(language, date);

    if (featuredContent) {
      const rawCandidates = extractWordsFromFeaturedContent(featuredContent, language);
      console.log(`[WikiPopulator] Extracted ${rawCandidates.length} raw candidates from featured content`);

      if (rawCandidates.length > 0) {
        const rankedCandidates = rankWordsByInterest(rawCandidates, language);
        console.log(`[WikiPopulator] Ranked ${rankedCandidates.length} valid candidates`);

        return { candidates: rankedCandidates };
      }
    }

    // Try random articles as secondary source
    console.log(`[WikiPopulator] No featured content, trying random articles for ${language}`);
    const randomArticles = await fetchRandomArticles(language, 10);

    if (randomArticles.length > 0) {
      const rawCandidates = randomArticles
        .filter(a => a.title)
        .map(a => ({
          word: a.title,
          source: 'random',
          url: a.content_urls?.desktop?.page
        }));

      const rankedCandidates = rankWordsByInterest(rawCandidates, language);
      console.log(`[WikiPopulator] Found ${rankedCandidates.length} candidates from random articles`);

      return { candidates: rankedCandidates };
    }

    return null;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[WikiPopulator] Wikipedia fetch error for ${language}:`, errorMessage);
    return null;
  }
}

/**
 * Check if a word already exists in the game dictionary (community_words)
 * to avoid duplicate insertion errors
 */
async function isWordInDictionary(
  word: string,
  language: Language
): Promise<boolean> {
  try {
    const { gameAIService } = await import('@/lib/ai-service');
    const result = await gameAIService.checkDatabaseOnly(word, language);
    return result.source === 'database' && result.isValid;
  } catch (error) {
    console.warn(`[WikiPopulator] Dictionary check failed for ${word}:`, error);
    return false;
  }
}

/**
 * Validate top candidates with AI service
 * Uses per-candidate error handling to ensure pipeline continues after individual failures
 */
async function validateTopCandidates(
  candidates: Array<{ word: string; score: number; source: string; url?: string }>,
  language: Language,
  dateStr: string
): Promise<Array<{ word: string; score: number; source: string; url?: string }>> {
  const validated: Array<{ word: string; score: number; source: string; url?: string }> = [];
  const errors: Array<{ word: string; error: string }> = [];

  // Validate top 10 candidates
  for (const candidate of candidates.slice(0, 10)) {
    try {
      const result = await validateWordWithAI(candidate.word, language, candidate.score);

      if (result.valid) {
        validated.push(candidate);

        // Update status in staging table
        await updateWordValidationStatus(language, candidate.word, dateStr, 'valid', candidate.score)
          .catch(err => logPipelineError('status-update', err, { word: candidate.word, language }));

        // AUTO-PROMOTION: High-scoring validated words go directly to dictionary
        if (candidate.score >= AUTO_PROMOTION_SCORE_THRESHOLD) {
          // Check if word already exists to avoid duplicate errors
          const alreadyInDict = await isWordInDictionary(candidate.word, language);

          if (!alreadyInDict) {
            try {
              const { gameAIService } = await import('@/lib/ai-service');
              await gameAIService.validateAndSaveWord(candidate.word, language);
              console.log(`[WikiPopulator] Auto-promoted ${candidate.word} (score: ${candidate.score}) to dictionary`);
            } catch (promoError) {
              // Log but don't fail - word is still validated
              logPipelineError('auto-promotion', promoError, {
                word: candidate.word,
                language,
                score: candidate.score
              });
            }
          } else {
            console.log(`[WikiPopulator] Word ${candidate.word} already in dictionary, skipping promotion`);
          }
        }
      } else {
        await updateWordValidationStatus(language, candidate.word, dateStr, 'invalid')
          .catch(err => logPipelineError('status-update', err, { word: candidate.word, language }));
      }

    } catch (error) {
      // Individual candidate failure - log and continue
      errors.push({
        word: candidate.word,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      logPipelineError('validation', error, {
        word: candidate.word,
        language,
        score: candidate.score
      });

      // For format-valid high-scoring words, still consider them validated
      // This handles the case where AI fails but format validation passes
      if (candidate.score >= FORMAT_ONLY_FALLBACK_THRESHOLD) {
        const formatResult = validateGameWord(candidate.word, language);
        if (formatResult.valid) {
          validated.push(candidate);
          console.log(`[WikiPopulator] Added ${candidate.word} despite error (format valid, high score)`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.warn(`[WikiPopulator] ${errors.length} candidates had errors:`,
      errors.map(e => `${e.word}: ${e.error}`).join(', ')
    );
  }

  // Automatically import validated words to word bank
  if (validated.length > 0) {
    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const validWords = validated.map(c => c.word);
        const importResult = await importWikipediaWordsToBank(supabase, language, validWords);
        console.log(
          `[WikiPopulator] Auto-imported ${importResult.inserted} validated words to word bank (${importResult.skipped} skipped, ${importResult.errors} errors)`
        );
      }
    } catch (importError) {
      // Log but don't fail - word validation succeeded even if word bank import failed
      logPipelineError('word-bank-import', importError, { language });
    }
  }

  return validated;
}

/**
 * Use fallback static word list when Wikipedia is unavailable
 */
function getFallbackWords(
  language: Language,
  recentlyUsed: Set<string>
): PopulationResult {
  const fallbackList = FALLBACK_WORD_LISTS[language] || FALLBACK_WORD_LISTS.en;

  // Filter out recently used words
  const availableWords = fallbackList.filter(word => !recentlyUsed.has(word));

  if (availableWords.length === 0) {
    console.warn(`[WikiPopulator] All fallback words for ${language} were recently used`);
    // Reset and use all words
    return {
      wordsFound: fallbackList.length,
      source: 'fallback',
      selectedWord: fallbackList[0],
      candidates: fallbackList.map((word, i) => ({
        word,
        score: 50 - i, // Decreasing scores
        source: 'fallback'
      }))
    };
  }

  return {
    wordsFound: availableWords.length,
    source: 'fallback',
    selectedWord: availableWords[0],
    candidates: availableWords.map((word, i) => ({
      word,
      score: 50 - i,
      source: 'fallback'
    }))
  };
}

/**
 * Get word candidates for admin review from UNIFIED WORD BANK
 * NOTE: Now reads from daily_challenge_word_bank instead of wikipedia_word_candidates
 */
export async function getWordCandidatesForAdmin(
  language: Language,
  date?: Date
): Promise<Array<{
  id: string;
  word: string;
  source: string;
  url?: string;
  score: number;
  status: string;
}>> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query for unified word bank
    let query = supabase
      .from('daily_challenge_word_bank')
      .select('id, word, source_article_title, source_article_url, interestingness_score, validation_status')
      .eq('language', language)
      .eq('source', 'wikipedia')
      .order('interestingness_score', { ascending: false, nullsFirst: false });

    // Optionally filter by fetch_date
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      query = query.eq('fetch_date', dateStr);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[WikiPopulator] Error fetching candidates for admin:', error.message);
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      word: d.word,
      source: d.source_article_title || 'wikipedia',
      url: d.source_article_url,
      score: d.interestingness_score || 50,
      status: d.validation_status
    }));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[WikiPopulator] Error fetching candidates for admin:', errorMessage);
    return [];
  }
}

/**
 * Admin: Update word candidate status in UNIFIED WORD BANK
 * NOTE: Now updates daily_challenge_word_bank
 * Mapping: 'valid' -> 'approved', 'invalid' -> 'rejected', 'pending' -> 'pending'
 */
export async function adminUpdateWordStatus(
  candidateId: string,
  status: 'valid' | 'invalid' | 'pending' | 'approved' | 'rejected'
): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Map old status values to new unified values
    const statusMap: Record<string, string> = {
      'valid': 'approved',
      'invalid': 'rejected',
      'pending': 'pending',
      'approved': 'approved',
      'rejected': 'rejected'
    };
    const mappedStatus = statusMap[status] || status;

    const { error } = await supabase
      .from('daily_challenge_word_bank')
      .update({ validation_status: mappedStatus })
      .eq('id', candidateId);

    if (error) {
      console.error('[WikiPopulator] Error updating word status:', error.message);
      return false;
    }

    return true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[WikiPopulator] Error updating word status:', errorMessage);
    return false;
  }
}

/**
 * Admin: Delete word from UNIFIED WORD BANK
 * NOTE: Now deletes from daily_challenge_word_bank
 */
export async function adminDeleteWordCandidate(candidateId: string): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('daily_challenge_word_bank')
      .delete()
      .eq('id', candidateId);

    if (error) {
      console.error('[WikiPopulator] Error deleting word:', error.message);
      return false;
    }

    return true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[WikiPopulator] Error deleting word:', errorMessage);
    return false;
  }
}

/**
 * Sync all local JSON words to database for admin panel visibility
 * This is useful when JSON files have been updated and need to be visible in admin
 *
 * IMPORTANT: Languages are processed in parallel to avoid timeout
 * With 7 languages each having 2000+ words, sequential processing would
 * exceed the 90-second server timeout. Parallel processing completes in ~15-30s.
 */
export async function syncLocalJSONToDatabase(
  language?: Language
): Promise<{ success: boolean; results: Record<string, { synced: number; error?: string }> }> {
  const targetLanguages = language ? [language] : (['en', 'he', 'sv', 'ja', 'es', 'fr', 'de'] as Language[]);
  const today = new Date();

  console.log(`[WikiPopulator] Starting local JSON sync for: ${targetLanguages.join(', ')} (parallel processing)`);
  const startTime = Date.now();

  // Process all languages in parallel to avoid timeout
  // Sequential processing of 7 languages with 2000+ words each would exceed 90s timeout
  const syncPromises = targetLanguages.map(async (lang) => {
    try {
      const jsonWords = await loadWordsFromJSON(lang);

      if (!jsonWords || jsonWords.length === 0) {
        return { lang, synced: 0, error: 'No JSON file found or empty' };
      }

      // Store all words with today's date
      await storeWikipediaWordCandidates(
        lang,
        today,
        jsonWords.map(w => ({
          word: w.word,
          source: `${w.source}_json_sync`,
          url: w.url,
          score: w.score
        }))
      );

      console.log(`[WikiPopulator] Synced ${jsonWords.length} words from JSON for ${lang}`);
      return { lang, synced: jsonWords.length };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[WikiPopulator] Error syncing JSON for ${lang}:`, errorMsg);
      return { lang, synced: 0, error: errorMsg };
    }
  });

  // Wait for all languages to complete
  const settledResults = await Promise.allSettled(syncPromises);

  // Collect results from all promises
  const results: Record<string, { synced: number; error?: string }> = {};
  for (const result of settledResults) {
    if (result.status === 'fulfilled') {
      const { lang, synced, error } = result.value;
      results[lang] = { synced, error };
    } else {
      // Promise rejected (shouldn't happen with our try-catch, but handle defensively)
      console.error('[WikiPopulator] Unexpected promise rejection:', result.reason);
    }
  }

  const duration = Date.now() - startTime;
  const allSuccess = Object.values(results).every(r => !r.error || r.synced > 0);

  console.log(`[WikiPopulator] JSON sync completed in ${duration}ms (success: ${allSuccess})`);

  return { success: allSuccess, results };
}

/**
 * Admin: Add custom word to UNIFIED WORD BANK
 * NOTE: Now adds to daily_challenge_word_bank with 'admin' source
 */
export async function adminAddWordCandidate(
  language: Language,
  date: Date,
  word: string,
  source: string = 'admin'
): Promise<{ success: boolean; id?: string }> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const dateStr = date.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_challenge_word_bank')
      .upsert({
        word: word.toUpperCase(),
        language,
        source: 'admin',
        status: 'active',
        validation_status: 'approved', // Admin words are pre-approved
        source_article_title: source,
        interestingness_score: 75, // Admin-added words get high score
        fetch_date: dateStr
      }, {
        onConflict: 'word,language'
      })
      .select('id')
      .single();

    if (error) {
      console.error('[WikiPopulator] Error adding word:', error.message);
      return { success: false };
    }

    return { success: true, id: data?.id };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[WikiPopulator] Error adding word:', errorMessage);
    return { success: false };
  }
}

/**
 * Export auto-promotion threshold for admin dashboard visibility
 * Allows admin UI to display the threshold value to users
 */
export const AUTO_PROMOTION_THRESHOLD = AUTO_PROMOTION_SCORE_THRESHOLD;
