/**
 * AI Word Generation
 * Handles themed board and bulk daily word generation
 */

import { type GenAIModel, trackTokenUsage } from './client';
import { z } from 'zod';
import {
  ThemedWordsResponseSchema,
  AI_TIMEOUT_CONFIG,
  LANGUAGE_NAMES,
  type TokenUsageStats,
} from './types';
import { withRetry } from './validation';
import logger from '@/backend/utils/logger';

/**
 * Generate a themed word board using AI
 */
export async function generateThemedBoard(
  model: GenAIModel,
  theme: string,
  count: number,
  language: string = 'en',
  withTimeout: <T>(promise: Promise<T>, timeoutMs: number, operationName: string) => Promise<T>
): Promise<string[]> {
  const languageName = LANGUAGE_NAMES[language] || language;

  // Use language-specific word length limits
  const minWordLength = language === 'ja' ? 2 : 4;
  const maxWordLength = language === 'ja' ? 4 : 10;

  const prompt = `Generate a JSON array of ${count} distinct words related to the theme '${theme}' in ${languageName}. Words must be between ${minWordLength} to ${maxWordLength} letters long. No spaces, no hyphens. Output raw JSON only.`;

  try {
    const aiPromise = model.generateContent(prompt);
    const result = await withTimeout(aiPromise, AI_TIMEOUT_CONFIG.themedBoard, 'Themed board generation');
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.info('AI_SERVICE', ' Could not extract JSON array from AI response');
      return [];
    }

    // Parse and validate with zod
    const parsed = JSON.parse(jsonMatch[0]);
    const validated = ThemedWordsResponseSchema.parse(parsed);

    // Filter to ensure word constraints
    const filteredWords = validated
      .map((w) => w.toLowerCase().trim())
      .filter((w) => w.length >= minWordLength && w.length <= maxWordLength && /^[a-zA-Z\u00C0-\u024F]+$/.test(w));

    return filteredWords;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info('AI_SERVICE', ' Themed words schema validation failed:', error.issues);
      return [];
    }
    logger.info('AI_SERVICE', ' generateThemedBoard error:', error);
    throw error;
  }
}

/**
 * Generate bulk words for daily challenges using AI
 */
export async function generateBulkWords(
  model: GenAIModel,
  language: string,
  count: number,
  excludedWords: Set<string>,
  existingWordList: string[] = [],
  lengthRange: { min: number; max: number } = { min: 4, max: 8 },
  withTimeout: <T>(promise: Promise<T>, timeoutMs: number, operationName: string) => Promise<T>,
  tokenUsage: TokenUsageStats
): Promise<Array<{ word: string; reason: string }>> {
  const languageName = LANGUAGE_NAMES[language] || 'English';
  const wordLengthDescription = language === 'ja'
    ? '2-4 character kanji compounds (熟語)'
    : `${lengthRange.min}-${lengthRange.max} letter words`;

  const exclusionList = Array.from(excludedWords).slice(0, 100).join(', ');
  const existingListStr = existingWordList.length > 0
    ? `\n\nYou may use words from this existing list if they fit: ${existingWordList.join(', ')}`
    : '';

  // Language-specific examples for richer vocabulary
  const languageExamples: Record<string, { good: string; avoid: string }> = {
    en: {
      good: 'APEX, LYNX, JADE, CRYSTAL, PHOENIX, THUNDER, GLACIER, ECLIPSE, NEBULA, WHISPER, PRISM, ZENITH, VELVET, RHYTHM, GLYPH, QUARTZ, SWIFT, PLASMA, COSMIC, CIPHER',
      avoid: 'CAT, DOG, TREE, BOOK, HAND, FOOT, BIKE, KITE, HOME, LOVE, GAME, TIME'
    },
    he: {
      good: 'חושך, מראה, ניצוץ, עננה, קרקע, שמיים, אוצר, גיבור, נהדר, מסתורי, אבקה, כוכב, לילה, בוקר, סערה, אגדה, עתיק, קסום, זוהר, מרהיב',
      avoid: 'בית, יום, מים, אדם, שנה, עבודה, עולם, חיים, ניטרון, ניקולאה, טלוויזיה, אינטרנט, ביולוגיה, פיזיקה, אלכסנדר'
    },
    sv: {
      good: 'SKYMNING, DIMMA, STJÄRNA, VINTER, ÅSKA, FJÄRIL, MYSTISK, FÖRUNDRA, GLITTER, KRISTALL, SMARAGD, FROSTIG, TROLLDOM, LABYRINT, GRYNING, OCEAN, VULKAN, GALAX, DIMMA, SKUGGA',
      avoid: 'HUS, DAG, ÅR, TID, MAN, BARN, LAND, VAD'
    },
    ja: {
      good: '神秘, 星空, 幻想, 黎明, 蒼穹, 瞬間, 輝石, 氷晶, 旋風, 彗星',
      avoid: '日本, 東京, 時間, 仕事, 学校, 毎日'
    },
    es: {
      good: 'CRISTAL, TRUENO, GLACIAR, ECLIPSE, PRISMA, CENIZA, VIENTO, CUMBRE, ABISMO, DESTELLO, BRUMA, CREPÚSCULO, ENIGMA, ZAFIRO, AURORA, OCÉANO, VOLCÁN, NIEBLA, COSMOS, TORMENTA',
      avoid: 'CASA, AGUA, VIDA, AMOR, TIEMPO, MUNDO, GENTE, BIEN'
    },
  };

  const examples = languageExamples[language] || languageExamples.en;

  // Language-specific rules to improve word quality
  const languageRules: Record<string, string> = {
    he: `
HEBREW-SPECIFIC RULES (CRITICAL):
- ONLY use native Hebrew words (שורש עברי). NO transliterations of foreign words.
- REJECT words like: ניטרון, ניקולאה, טלוויזיה, אינטרנט, טלפון, ביולוגיה, פיזיקה
- REJECT proper nouns, names of people, places, brands
- REJECT scientific/technical terms borrowed from Latin/Greek/English
- PREFER words from Hebrew roots (שורשים): e.g., כתיבה (כ.ת.ב), הליכה (ה.ל.כ), שמירה (ש.מ.ר)
- Good native words: חלום, סערה, אגדה, ניצוץ, זוהר, קסם, מראה, כוכב`,
    en: '',
    sv: '',
    ja: '',
    es: '',
  };

  const langRules = languageRules[language] || '';

  const prompt = `Generate ${count} rich, diverse words for a word puzzle game.

LANGUAGE: ${languageName}
FORMAT: ${wordLengthDescription}
COUNT: ${count}

VOCABULARY DIVERSITY REQUIREMENTS:
- Include NOUNS (objects, places, phenomena): 40%
- Include VERBS (actions, states): 30%
- Include ADJECTIVES (descriptive): 20%
- Include other (adverbs, rare words): 10%
- Prefer evocative, interesting words players enjoy discovering
- Mix word lengths: short (${lengthRange.min}-5), medium (5-6), long (6-${lengthRange.max})
- Prioritize character variety (avoid double letters like BOOK, TREE)
- Must be real, valid ${languageName} words
- NO proper nouns, brand names, or person/place names
- NO transliterations or foreign loanwords — only native ${languageName} vocabulary
${langRules}
GOOD EXAMPLES: ${examples.good}
AVOID BASIC WORDS: ${examples.avoid}
EXCLUDED (recently used): ${exclusionList || 'None'}${existingListStr}

Output ONLY valid JSON:
{"words":[{"word":"WORD","reason":"category/theme"}]}`;

  try {
    // Use retry logic with timeout
    const result = await withRetry(async () => {
      const aiPromise = model.generateContent(prompt);
      return await withTimeout(aiPromise, AI_TIMEOUT_CONFIG.bulkGeneration, 'Bulk word generation');
    }, 'generateBulkWords');

    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Track token usage
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(text.length / 4);
    trackTokenUsage(tokenUsage, inputTokens, outputTokens);

    // Strip markdown code blocks if present
    const cleanText = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response - no JSON found');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const generatedWords = parsed.words || [];

    if (!Array.isArray(generatedWords) || generatedWords.length === 0) {
      throw new Error('AI returned invalid word array');
    }

    // Return the words with their reasons
    return generatedWords.map((entry: { word: string; reason: string }) => ({
      word: entry.word ? entry.word.toUpperCase() : '',
      reason: entry.reason || 'AI selected',
    }));
  } catch (error) {
    logger.info('AI_SERVICE', ' generateBulkWords error:', error);
    throw error;
  }
}
