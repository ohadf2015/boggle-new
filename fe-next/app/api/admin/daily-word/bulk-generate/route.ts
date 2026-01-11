import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { Language } from '@/types';
import { gameAIService } from '@/lib/ai-service';

// Increase timeout for AI generation
export const maxDuration = 60; // 60 seconds

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;
const NO_REPEAT_DAYS = 30;

// Word length range by language (min, max)
const WORD_LENGTH_RANGE: Record<Language, { min: number; max: number }> = {
  en: { min: 4, max: 8 },
  he: { min: 3, max: 8 },
  sv: { min: 3, max: 8 },
  ja: { min: 2, max: 4 }, // Japanese uses kanji compounds
  es: { min: 4, max: 8 },
  fr: { min: 4, max: 8 },
  de: { min: 4, max: 8 },
};

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  he: 'Hebrew',
  sv: 'Swedish',
  ja: 'Japanese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};

/**
 * POST /api/admin/daily-word/bulk-generate
 * Generate unique words for a date range using AI
 * Returns suggested words for admin approval before saving
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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

    // Use AI to generate words
    let generatedWords: Array<{ date: string; word: string; reason: string }> = [];
    let aiConfigured = false;

    // Check if Vertex AI is configured
    try {
      aiConfigured = await gameAIService.isConfigured();
      
      if (aiConfigured) {
        generatedWords = await generateWordsWithAI(
          language as Language,
          datesToGenerate,
          recentlyUsedWords,
          existingWords || []
        );
      } else {
        console.warn('Vertex AI not configured - GOOGLE_CREDENTIALS_JSON required');
        generatedWords = datesToGenerate.map(date => ({
          date,
          word: '',
          reason: 'Vertex AI not configured - enter manually',
        }));
      }
    } catch (error) {
      console.error('AI service check failed:', error);
      aiConfigured = false;
      generatedWords = datesToGenerate.map(date => ({
        date,
        word: '',
        reason: 'AI service unavailable - enter manually',
      }));
    }

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
      },
    });
  } catch (error) {
    console.error('Bulk generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/daily-word/bulk-generate
 * Save the approved bulk words to the database
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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
            override_by: user.id,
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
    console.error('Bulk save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getRecentlyUsedWords(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
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
    console.error('Error fetching recently used words:', error);
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
  const languageName = LANGUAGE_NAMES[language] || 'English';

  const wordLengthDescription = language === 'ja'
    ? '2-4 character kanji compounds (熟語)'
    : `${lengthRange.min}-${lengthRange.max} letter words`;

  const exclusionList = Array.from(excludedWords).slice(0, 100).join(', ');
  const existingListStr = existingWordList.length > 0
    ? `\n\nYou may use words from this existing list if they fit: ${existingWordList.join(', ')}`
    : '';

  const prompt = `You are generating daily words for a word puzzle game called "Word Hunt" (similar to Wordle).

LANGUAGE: ${languageName}
WORD FORMAT: ${wordLengthDescription}
NUMBER OF WORDS NEEDED: ${dates.length}

REQUIREMENTS:
1. Generate ${dates.length} unique, interesting ${wordLengthDescription}
2. Words should be common enough to be guessable but not too basic
3. Avoid very simple/common words like CAT, DOG, TREE, BOOK
4. Prefer words with good character variety (avoid repeated letters)
5. Words should be real, valid words in ${languageName}
6. NO REPEATS - each word must be different
7. MIX word lengths - include both shorter (4-5 letter) and longer (6-8 letter) words for variety

EXCLUDED WORDS (recently used, do NOT use these):
${exclusionList || 'None'}${existingListStr}

GOOD EXAMPLES for English: APEX, LYNX, JADE, CRYSTAL, PHOENIX, THUNDER, GLACIER, ECLIPSE, NEBULA, WHISPER
AVOID for English: CAT, DOG, TREE, BOOK, HAND, FOOT, BIKE, KITE

Generate exactly ${dates.length} words. Respond with ONLY valid JSON (no markdown):
{
  "words": [
    {"word": "WORD1", "reason": "brief reason (max 30 chars)"},
    {"word": "WORD2", "reason": "brief reason (max 30 chars)"}
  ]
}`;

  try {
    // Initialize the AI service
    // @ts-ignore - Access private initialize for admin bulk generation
    await gameAIService.initialize();
    
    // Access the model through the service
    // @ts-ignore - Access private model for custom prompt
    const model = gameAIService['model'];
    if (!model) {
      throw new Error('Vertex AI model not available');
    }

    const result = await model.generateContent(prompt);

    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code blocks if present
    const cleanText = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const generatedWords = parsed.words || [];

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
    console.error('AI generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'AI generation failed - please enter manually';
    
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
