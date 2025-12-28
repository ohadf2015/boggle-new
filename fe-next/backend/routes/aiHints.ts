/**
 * AI Hint Generation API
 * Generates progressive hints for Word Hunt Survival Mode using Claude
 */

import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import logger from '@/utils/logger';

const router = Router();

// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

interface GenerateHintsRequest {
  targetWord: string;
  language: string;
}

interface HintLevel {
  level: number;
  hint: string;
  unlockCost: number;
}

interface HintGenerationResponse {
  hints: HintLevel[];
  category: string;
  exampleSentence: string;
}

/**
 * POST /api/generate-word-hints
 * Generate progressive AI hints for a target word
 */
router.post('/generate-word-hints', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!anthropic) {
      res.status(503).json({ error: 'AI service not configured' });
      return;
    }

    const { targetWord, language } = req.body as GenerateHintsRequest;

    if (!targetWord) {
      res.status(400).json({ error: 'Target word is required' });
      return;
    }

    const languageNames: Record<string, string> = {
      en: 'English',
      he: 'Hebrew',
      sv: 'Swedish',
      ja: 'Japanese',
      es: 'Spanish',
    };

    const langName = languageNames[language] || 'English';

    // Generate hints as progressive blanks with revealed letters
    // Reveal vowels from the END first, never reveal more than 50% of letters
    // For word "BIRD" (4 letters, max reveal = 2):
    // Level 1: "_ _ _ _" (no letters)
    // Level 2: "_ I _ _" (last vowel only)
    // Level 3: "_ I _ _" (1 letter - 25% of max)
    // Level 4: "_ I _ D" (2 letters - 50% of word)
    // Level 5: "_ I _ D" (still max 50%)
    const wordLength = targetWord.length;
    const vowelPositions = findVowelPositions(targetWord, language);

    // Maximum letters we can ever reveal is 50% of the word (rounded down)
    const maxReveal = Math.floor(wordLength / 2);

    // Sort vowel positions from end to start (reverse order)
    const vowelsFromEnd = [...vowelPositions].sort((a, b) => b - a);

    // Get consonant positions from end to start
    const consonantPositions = [...Array(wordLength).keys()]
      .filter(i => !vowelPositions.includes(i))
      .sort((a, b) => b - a);

    // Build reveal order: vowels from end, then consonants from end
    const revealOrder = [...vowelsFromEnd, ...consonantPositions];

    const hints = [];

    // Level 1: All blanks
    hints.push({
      level: 1,
      hint: Array(wordLength).fill('_').join(' '),
      unlockCost: 0,
    });

    // Level 2: Last vowel revealed (or last letter if no vowels) - max 1 letter
    const lastVowelPos = vowelsFromEnd.length > 0 ? [vowelsFromEnd[0]] : [wordLength - 1];
    const level2Chars = [];
    for (let i = 0; i < wordLength; i++) {
      if (lastVowelPos.includes(i)) {
        level2Chars.push(targetWord[i].toUpperCase());
      } else {
        level2Chars.push('_');
      }
    }
    hints.push({
      level: 2,
      hint: level2Chars.join(' '),
      unlockCost: 4,
    });

    if (wordLength >= 4) {
      // Level 3: Reveal up to ceil(maxReveal * 0.5) letters
      const level3Count = Math.min(Math.ceil(maxReveal * 0.5), revealOrder.length);
      const level3Positions = revealOrder.slice(0, level3Count);
      const level3Chars = [];
      for (let i = 0; i < wordLength; i++) {
        if (level3Positions.includes(i)) {
          level3Chars.push(targetWord[i].toUpperCase());
        } else {
          level3Chars.push('_');
        }
      }
      hints.push({
        level: 3,
        hint: level3Chars.join(' '),
        unlockCost: 8,
      });

      // Level 4: Reveal up to ceil(maxReveal * 0.75) letters
      const level4Count = Math.min(Math.ceil(maxReveal * 0.75), revealOrder.length);
      const level4Positions = revealOrder.slice(0, level4Count);
      const level4Chars = [];
      for (let i = 0; i < wordLength; i++) {
        if (level4Positions.includes(i)) {
          level4Chars.push(targetWord[i].toUpperCase());
        } else {
          level4Chars.push('_');
        }
      }
      hints.push({
        level: 4,
        hint: level4Chars.join(' '),
        unlockCost: 12,
      });

      // Level 5: Reveal exactly maxReveal letters (50% of word)
      const level5Positions = revealOrder.slice(0, maxReveal);
      const level5Chars = [];
      for (let i = 0; i < wordLength; i++) {
        if (level5Positions.includes(i)) {
          level5Chars.push(targetWord[i].toUpperCase());
        } else {
          level5Chars.push('_');
        }
      }
      hints.push({
        level: 5,
        hint: level5Chars.join(' '),
        unlockCost: 16,
      });
    }
    // Note: 3-letter words are no longer valid targets in daily challenge (minimum is 4 letters)

    // For category and example, we still use AI
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `For the word "${targetWord}" in ${langName}, provide:
1. A category path (e.g., "Living Things > Animals > Mammals > Pets")
2. A natural example sentence using the word

Return ONLY JSON: {"category": "...", "exampleSentence": "..."}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse Claude's response for category and example
    const responseText = content.text.trim();
    let category = 'Unknown';
    let exampleSentence = `The ${targetWord} was beautiful.`;

    try {
      // Try to extract JSON if Claude wrapped it in markdown
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        category = parsed.category || category;
        exampleSentence = parsed.exampleSentence || exampleSentence;
      } else {
        const parsed = JSON.parse(responseText);
        category = parsed.category || category;
        exampleSentence = parsed.exampleSentence || exampleSentence;
      }
    } catch (parseError) {
      logger.error('API', `Failed to parse Claude category response: ${parseError}`);
      // Use defaults already set
    }

    // Return hints (generated above) with AI-generated category and example
    const hintData: HintGenerationResponse = {
      hints,
      category,
      exampleSentence,
    };

    res.json(hintData);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Hint generation error: ${err.message}`);

    // Return fallback hints on error
    const { targetWord } = req.body;
    const fallback = generateFallbackHints(targetWord || 'WORD');
    res.json(fallback);
  }
});

/**
 * Generate blanks display for a word with some letters revealed
 * E.g., revealPositions = [0, 2] for "WORD" -> "W _ R _"
 */
function generateBlanksDisplay(word: string, revealPositions: number[]): string {
  const chars: string[] = [];
  for (let i = 0; i < word.length; i++) {
    if (revealPositions.includes(i)) {
      chars.push(word[i].toUpperCase());
    } else {
      chars.push('_');
    }
  }
  return chars.join(' ');
}

/**
 * Get vowels for a specific language
 */
function getVowelsForLanguage(language: string): Set<string> {
  const vowelSets: Record<string, string[]> = {
    en: ['A', 'E', 'I', 'O', 'U'],
    he: ['א', 'ע', 'י', 'ו'], // Hebrew vowel letters (matres lectionis)
    sv: ['A', 'E', 'I', 'O', 'U', 'Y', 'Å', 'Ä', 'Ö'],
    ja: ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'], // Hiragana/Katakana vowels
    es: ['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú'],
    fr: ['A', 'E', 'I', 'O', 'U', 'Y', 'À', 'Â', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Ÿ'],
    de: ['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü'],
  };
  return new Set(vowelSets[language] || vowelSets['en']);
}

/**
 * Find positions of vowels in a word
 */
function findVowelPositions(word: string, language: string): number[] {
  const vowels = getVowelsForLanguage(language);
  const positions: number[] = [];
  for (let i = 0; i < word.length; i++) {
    if (vowels.has(word[i].toUpperCase())) {
      positions.push(i);
    }
  }
  return positions;
}

/**
 * Fallback hint generation when AI is unavailable
 * Reveals vowels from the END first, never reveals more than 50% of letters
 */
function generateFallbackHints(targetWord: string, language = 'en'): HintGenerationResponse {
  const wordLength = targetWord.length;
  const vowelPositions = findVowelPositions(targetWord, language);

  // Maximum letters we can ever reveal is 50% of the word (rounded down)
  const maxReveal = Math.floor(wordLength / 2);

  // Sort vowel positions from end to start (reverse order)
  const vowelsFromEnd = [...vowelPositions].sort((a, b) => b - a);

  // Get consonant positions from end to start
  const consonantPositions = [...Array(wordLength).keys()]
    .filter(i => !vowelPositions.includes(i))
    .sort((a, b) => b - a);

  // Build reveal order: vowels from end, then consonants from end
  const revealOrder = [...vowelsFromEnd, ...consonantPositions];

  const hints: HintLevel[] = [
    {
      level: 1,
      hint: generateBlanksDisplay(targetWord, []), // "_ _ _ _"
      unlockCost: 0,
    },
  ];

  // Level 2: Reveal last vowel (or last letter if no vowels) - max 1 letter
  const lastVowelPos = vowelsFromEnd.length > 0 ? [vowelsFromEnd[0]] : [wordLength - 1];
  hints.push({
    level: 2,
    hint: generateBlanksDisplay(targetWord, lastVowelPos.slice(0, 1)),
    unlockCost: 4,
  });

  if (wordLength >= 4) {
    // Level 3: Reveal up to ceil(maxReveal * 0.5) letters
    const level3Count = Math.min(Math.ceil(maxReveal * 0.5), revealOrder.length);
    const level3Positions = revealOrder.slice(0, level3Count);
    hints.push({
      level: 3,
      hint: generateBlanksDisplay(targetWord, level3Positions.sort((a, b) => a - b)),
      unlockCost: 8,
    });

    // Level 4: Reveal up to ceil(maxReveal * 0.75) letters
    const level4Count = Math.min(Math.ceil(maxReveal * 0.75), revealOrder.length);
    const level4Positions = revealOrder.slice(0, level4Count);
    hints.push({
      level: 4,
      hint: generateBlanksDisplay(targetWord, level4Positions.sort((a, b) => a - b)),
      unlockCost: 12,
    });

    // Level 5: Reveal exactly maxReveal letters (50% of word)
    const level5Positions = revealOrder.slice(0, maxReveal);
    hints.push({
      level: 5,
      hint: generateBlanksDisplay(targetWord, level5Positions.sort((a, b) => a - b)),
      unlockCost: 16,
    });
  }
  // Note: 3-letter words are no longer valid targets in daily challenge (minimum is 4 letters)

  return {
    hints,
    category: 'Unknown',
    exampleSentence: `The ${targetWord} was beautiful.`,
  };
}

export default router;
