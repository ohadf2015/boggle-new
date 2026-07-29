import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';
import type { Language } from '@/types';
import { gameAIService } from '@/lib/ai-service';
import {
  getWordsFromWordBank,
  getWordsFromStaticList,
  markWordAsUsed,
} from '@/lib/dailyChallenge/wordBankService';

// Increase timeout for AI generation (allows for retries and slow responses)
export const maxDuration = 120; // 120 seconds for bulk generation with retries

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;
const NO_REPEAT_DAYS = 30;

// Word length range by language (min, max)
// IMPORTANT: Minimum length must be 4 for all languages except Japanese (kanji compounds)
// This matches the validation in wikipediaWordProcessor.ts
// Max must stay <= MAX_TARGET_WORD_LENGTH (6) so daily targets fit gameplay cap.
const WORD_LENGTH_RANGE: Record<Language, { min: number; max: number }> = {
  en: { min: 4, max: 6 },
  he: { min: 4, max: 6 },
  sv: { min: 4, max: 6 },
  ja: { min: 2, max: 4 }, // Japanese uses kanji compounds (2-4 characters)
  es: { min: 4, max: 6 },
  fr: { min: 4, max: 6 },
  de: { min: 4, max: 6 },
};


/**
 * POST /api/admin/daily-word/bulk-generate
 * Generate unique words for a date range using AI
 * Returns suggested words for admin approval before saving
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { language, startDate, endDate, existingWords } = body;

    if (!language || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'language, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language code' },
        { status: 400 }
      );
    }

    // Calculate dates in range
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    const dates: string[] = [];

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    if (dates.length > 31) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 31 days' },
        { status: 400 }
      );
    }

    // Get recently used words to exclude
    const recentlyUsedWords = await getRecentlyUsedWords(supabase, language, startDate);

    // Get words that are already scheduled in the date range
    const { data: existingScheduled } = await supabase
      .from('daily_target_words')
      .select('puzzle_date, target_word, override_word')
      .eq('language', language)
      .gte('puzzle_date', startDate)
      .lte('puzzle_date', endDate);

    const scheduledDates = new Set(existingScheduled?.map(e => e.puzzle_date) || []);
    const datesToGenerate = dates.filter(d => !scheduledDates.has(d));

    if (datesToGenerate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All dates already have words scheduled',
        generatedWords: [],
        existingWords: existingScheduled?.map(e => ({
          date: e.puzzle_date,
          word: e.override_word || e.target_word,
        })) || [],
      });
    }

    // Generate words using multiple sources (word bank → static list → AI)
    let generatedWords: Array<{ date: string; word: string; reason: string; source: string }> = [];
    let aiConfigured = false;

    // Step 1: Try to get words from word bank first
    const wordBankWords = await getWordsFromWordBank(
      supabase,
      language as Language,
      datesToGenerate.length,
      recentlyUsedWords
    );

    // Step 2: If not enough from word bank, supplement with static list
    const combinedFallbackWords = [...wordBankWords];
    if (combinedFallbackWords.length < datesToGenerate.length) {
      const usedFromBank = new Set(wordBankWords.map(w => w.word));
      const combinedExclude = new Set([...recentlyUsedWords, ...usedFromBank]);
      const staticWords = getWordsFromStaticList(
        language as Language,
        datesToGenerate.length - combinedFallbackWords.length,
        combinedExclude
      );
      combinedFallbackWords.push(...staticWords);
    }

    // If we have enough words from word bank + static, use those
    if (combinedFallbackWords.length >= datesToGenerate.length) {
      generatedWords = datesToGenerate.map((date, i) => ({
        date,
        word: combinedFallbackWords[i]?.word || '',
        reason: combinedFallbackWords[i]?.source === 'word_bank'
          ? 'Selected from curated word bank'
          : 'Selected from static word list',
        source: combinedFallbackWords[i]?.source || 'static',
      }));
    } else {
      // Step 3: Use AI to generate remaining words
      try {
        aiConfigured = await gameAIService.isConfigured();

        if (aiConfigured) {
          // Add words we already have from fallback
          const prefilledWords: Array<{ date: string; word: string; reason: string; source: string }> = [];
          const datesToGenerateWithAI: string[] = [];

          for (let i = 0; i < datesToGenerate.length; i++) {
            if (combinedFallbackWords[i]) {
              prefilledWords.push({
                date: datesToGenerate[i],
                word: combinedFallbackWords[i].word,
                reason: combinedFallbackWords[i].source === 'word_bank'
                  ? 'Selected from curated word bank'
                  : 'Selected from static word list',
                source: combinedFallbackWords[i].source,
              });
            } else {
              datesToGenerateWithAI.push(datesToGenerate[i]);
            }
          }

          // Generate remaining with AI
          if (datesToGenerateWithAI.length > 0) {
            const usedWords = new Set([...recentlyUsedWords, ...combinedFallbackWords.map(w => w.word)]);
            const aiWords = await generateWordsWithAI(
              language as Language,
              datesToGenerateWithAI,
              usedWords,
              existingWords || []
            );

            // Combine prefilled and AI-generated
            let aiIndex = 0;
            for (let i = 0; i < datesToGenerate.length; i++) {
              if (combinedFallbackWords[i]) {
                generatedWords.push(prefilledWords.find(w => w.date === datesToGenerate[i])!);
              } else {
                const aiWord = aiWords[aiIndex++];
                generatedWords.push({
                  ...aiWord,
                  source: 'ai',
                });
              }
            }
          } else {
            generatedWords = prefilledWords;
          }
        } else {
          console.warn('Vertex AI not configured - using fallback words only');
          generatedWords = datesToGenerate.map((date, i) => ({
            date,
            word: combinedFallbackWords[i]?.word || '',
            reason: combinedFallbackWords[i]
              ? 'Selected from fallback list'
              : 'No word available - please enter manually',
            source: combinedFallbackWords[i]?.source || 'manual',
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('AI service check failed:', errorMessage);
        aiConfigured = false;
        generatedWords = datesToGenerate.map((date, i) => ({
          date,
          word: combinedFallbackWords[i]?.word || '',
          reason: combinedFallbackWords[i]
            ? 'Selected from fallback list (AI unavailable)'
            : error instanceof Error ? error.message : 'AI unavailable - please enter manually',
          source: combinedFallbackWords[i]?.source || 'manual',
        }));
      }
    }

    // Count words by source
    const sourceStats = {
      word_bank: generatedWords.filter(w => w.source === 'word_bank').length,
      static: generatedWords.filter(w => w.source === 'static').length,
      ai: generatedWords.filter(w => w.source === 'ai').length,
      manual: generatedWords.filter(w => w.source === 'manual' || !w.word).length,
    };

    return NextResponse.json({
      success: true,
      aiConfigured,
      generatedWords,
      existingWords: existingScheduled?.map(e => ({
        date: e.puzzle_date,
        word: e.override_word || e.target_word,
      })) || [],
      excludedWords: Array.from(recentlyUsedWords).slice(0, 50),
      stats: {
        totalDates: dates.length,
        existingDates: scheduledDates.size,
        generatedDates: datesToGenerate.length,
        excludedWordsCount: recentlyUsedWords.size,
        sourceStats,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Bulk generate error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/daily-word/bulk-generate',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/daily-word/bulk-generate
 * Save the approved bulk words to the database
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { language, words } = body;

    if (!language || !words || !Array.isArray(words)) {
      return NextResponse.json(
        { error: 'language and words array are required' },
        { status: 400 }
      );
    }

    const results: Array<{ date: string; word: string; status: 'created' | 'updated' | 'error'; error?: string }> = [];

    for (const { date, word } of words) {
      if (!date || !word) {
        results.push({ date, word, status: 'error', error: 'Missing date or word' });
        continue;
      }

      const formattedWord = word.toUpperCase().trim();
      const puzzleNumber = getPuzzleNumber(date);

      // Check if entry exists
      const { data: existing } = await supabase
        .from('daily_target_words')
        .select('id')
        .eq('puzzle_date', date)
        .eq('language', language)
        .single();

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('daily_target_words')
          .update({
            override_word: formattedWord,
            override_by: authResult.user!.id,
            override_at: new Date().toISOString(),
            grid: null,
            grid_generated_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          results.push({ date, word: formattedWord, status: 'error', error: updateError.message });
        } else {
          results.push({ date, word: formattedWord, status: 'updated' });
        }
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('daily_target_words')
          .insert({
            puzzle_date: date,
            language,
            puzzle_number: puzzleNumber,
            target_word: formattedWord,
            ai_selected: false,
            ai_reason: 'Admin bulk selection',
          });

        if (insertError) {
          results.push({ date, word: formattedWord, status: 'error', error: insertError.message });
        } else {
          results.push({ date, word: formattedWord, status: 'created' });
        }
      }

      // Mark word as used in word bank (fire and forget - don't fail if word isn't in bank)
      markWordAsUsed(supabase, formattedWord, language as Language).catch(() => {
        // Silently ignore - word may not be in word bank
      });
    }

    const created = results.filter(r => r.status === 'created').length;
    const updated = results.filter(r => r.status === 'updated').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: errors === 0,
      summary: { created, updated, errors },
      results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Bulk save error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/daily-word/bulk-generate',
      { method: 'PUT', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function getRecentlyUsedWords(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  language: string,
  targetDate: string
): Promise<Set<string>> {
  const targetDateObj = new Date(targetDate + 'T00:00:00Z');

  const startDate = new Date(targetDateObj);
  startDate.setUTCDate(startDate.getUTCDate() - NO_REPEAT_DAYS);

  const endDate = new Date(targetDateObj);
  endDate.setUTCDate(endDate.getUTCDate() + NO_REPEAT_DAYS);

  const { data, error } = await supabase
    .from('daily_target_words')
    .select('target_word, override_word')
    .eq('language', language)
    .gte('puzzle_date', startDate.toISOString().split('T')[0])
    .lte('puzzle_date', endDate.toISOString().split('T')[0]);

  if (error) {
    const errorMessage = error.message || 'Unknown error';
    console.error('Error fetching recently used words:', errorMessage);
    return new Set();
  }

  const usedWords = new Set<string>();
  for (const row of data || []) {
    if (row.target_word) usedWords.add(row.target_word.toUpperCase());
    if (row.override_word) usedWords.add(row.override_word.toUpperCase());
  }

  return usedWords;
}

async function generateWordsWithAI(
  language: Language,
  dates: string[],
  excludedWords: Set<string>,
  existingWordList: string[]
): Promise<Array<{ date: string; word: string; reason: string }>> {
  const lengthRange = WORD_LENGTH_RANGE[language] || { min: 4, max: 8 };

  try {
    // Use the AI service's bulk generation method with retry logic
    const generatedWords = await gameAIService.generateBulkWords(
      language,
      dates.length,
      excludedWords,
      existingWordList,
      lengthRange
    );

    // Map words to dates, ensuring uniqueness
    const usedInBatch = new Set<string>();
    const result_words: Array<{ date: string; word: string; reason: string }> = [];

    for (let i = 0; i < dates.length; i++) {
      const wordEntry = generatedWords[i];
      if (wordEntry && wordEntry.word) {
        const word = wordEntry.word.toUpperCase();

        // Skip if already used in this batch or in excluded list
        if (usedInBatch.has(word) || excludedWords.has(word)) {
          result_words.push({
            date: dates[i],
            word: '',
            reason: 'AI suggestion was duplicate - please enter manually',
          });
        } else {
          usedInBatch.add(word);
          result_words.push({
            date: dates[i],
            word,
            reason: wordEntry.reason || 'AI selected',
          });
        }
      } else {
        result_words.push({
          date: dates[i],
          word: '',
          reason: 'No AI suggestion - please enter manually',
        });
      }
    }

    return result_words;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'AI generation failed - please enter manually';
    console.error('AI generation failed:', errorMessage);

    return dates.map(date => ({
      date,
      word: '',
      reason: errorMessage,
    }));
  }
}

function getPuzzleNumber(dateString: string): number {
  const DAILY_CHALLENGE_EPOCH = new Date('2025-12-30T00:00:00Z');
  const date = new Date(dateString + 'T00:00:00Z');
  const daysSinceEpoch = Math.floor((date.getTime() - DAILY_CHALLENGE_EPOCH.getTime()) / (24 * 60 * 60 * 1000));
  return daysSinceEpoch + 1;
}
