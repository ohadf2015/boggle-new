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
    // Ensure non-adjacent reveals for better challenge
    // For word "BIRD" (4 letters):
    // Level 1: "_ _ _ _" (no letters)
    // Level 2: "B _ _ _" (first letter only)
    // Level 3: "B _ R _" (first and third - not adjacent)
    // Level 4: "B _ R D" (first, third, last - spaced out)
    // Level 5: "B _ R D" (all but second letter hidden)
    const wordLength = targetWord.length;
    const hints = [];

    // Level 1: All blanks
    hints.push({
      level: 1,
      hint: Array(wordLength).fill('_').join(' '),
      unlockCost: 0,
    });

    // Level 2: First letter revealed
    hints.push({
      level: 2,
      hint: [targetWord[0].toUpperCase(), ...Array(wordLength - 1).fill('_')].join(' '),
      unlockCost: 0,
    });

    if (wordLength >= 4) {
      // Level 3: First and third letters (positions 0, 2) - not adjacent
      const level3Chars = [];
      for (let i = 0; i < wordLength; i++) {
        if (i === 0 || i === 2) {
          level3Chars.push(targetWord[i].toUpperCase());
        } else {
          level3Chars.push('_');
        }
      }
      hints.push({
        level: 3,
        hint: level3Chars.join(' '),
        unlockCost: 4,
      });

      // Level 4: First, third, and last (positions 0, 2, last) - spaced out
      const level4Chars = [];
      for (let i = 0; i < wordLength; i++) {
        if (i === 0 || i === 2 || i === wordLength - 1) {
          level4Chars.push(targetWord[i].toUpperCase());
        } else {
          level4Chars.push('_');
        }
      }
      hints.push({
        level: 4,
        hint: level4Chars.join(' '),
        unlockCost: 6,
      });

      // Level 5: All but second letter (position 1 hidden)
      const level5Chars = [];
      for (let i = 0; i < wordLength; i++) {
        if (i !== 1) {
          level5Chars.push(targetWord[i].toUpperCase());
        } else {
          level5Chars.push('_');
        }
      }
      hints.push({
        level: 5,
        hint: level5Chars.join(' '),
        unlockCost: 8,
      });
    } else if (wordLength === 3) {
      // For 3-letter words: first and last (not adjacent)
      hints.push({
        level: 3,
        hint: [targetWord[0].toUpperCase(), '_', targetWord[2].toUpperCase()].join(' '),
        unlockCost: 4,
      });
    }

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
 * Fallback hint generation when AI is unavailable
 * Generates progressive hints that reveal letters in blanks format
 * Ensures non-adjacent letter reveals for better challenge
 */
function generateFallbackHints(targetWord: string): HintGenerationResponse {
  const wordLength = targetWord.length;

  // Progressive reveal positions with non-adjacent spacing
  const hints: HintLevel[] = [
    {
      level: 1,
      hint: generateBlanksDisplay(targetWord, []), // "_ _ _ _"
      unlockCost: 0,
    },
    {
      level: 2,
      hint: generateBlanksDisplay(targetWord, [0]), // "B _ _ _"
      unlockCost: 0,
    },
  ];

  // Add progressive hints - ensure non-adjacent reveals
  if (wordLength >= 4) {
    // Level 3: First and third letters (positions 0, 2) - not adjacent
    hints.push({
      level: 3,
      hint: generateBlanksDisplay(targetWord, [0, 2]), // "B _ R _"
      unlockCost: 4,
    });

    // Level 4: First, third, and last - spaced out
    hints.push({
      level: 4,
      hint: generateBlanksDisplay(targetWord, [0, 2, wordLength - 1]), // "B _ R D"
      unlockCost: 6,
    });

    // Level 5: All but second letter (position 1 hidden)
    const allButSecond: number[] = [];
    for (let i = 0; i < wordLength; i++) {
      if (i !== 1) allButSecond.push(i);
    }
    hints.push({
      level: 5,
      hint: generateBlanksDisplay(targetWord, allButSecond), // "B _ R D"
      unlockCost: 8,
    });
  }

  return {
    hints,
    category: 'Unknown',
    exampleSentence: `The ${targetWord} was beautiful.`,
  };
}

export default router;
