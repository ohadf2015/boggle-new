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

    // Generate hints using Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are helping create progressive hints for a word guessing game. The target word is "${targetWord}" in ${langName}.

Generate 5 progressive hints that start VERY vague and get increasingly specific. Each hint should help players deduce the word without giving it away directly.

Hint progression:
1. Very vague (general category or domain)
2. Slightly more specific (characteristics or context)
3. More concrete (usage or associations)
4. Very specific (narrow the possibilities)
5. Almost obvious (but still doesn't say the word)

Also provide:
- A category path (e.g., "Living Things > Animals > Mammals > Pets")
- An example sentence using the word (keep it natural and helpful)

Return your response in this exact JSON format:
{
  "hints": [
    {"level": 1, "hint": "hint text", "unlockCost": 0},
    {"level": 2, "hint": "hint text", "unlockCost": 1},
    {"level": 3, "hint": "hint text", "unlockCost": 2},
    {"level": 4, "hint": "hint text", "unlockCost": 3},
    {"level": 5, "hint": "hint text", "unlockCost": 5}
  ],
  "category": "category path",
  "exampleSentence": "example sentence with the word"
}

Important: Return ONLY the JSON, no other text.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse Claude's response
    const responseText = content.text.trim();
    let hintData: HintGenerationResponse;

    try {
      // Try to extract JSON if Claude wrapped it in markdown
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        hintData = JSON.parse(jsonMatch[0]);
      } else {
        hintData = JSON.parse(responseText);
      }
    } catch (parseError) {
      logger.error('API', `Failed to parse Claude response: ${parseError}`);
      // Return fallback hints
      hintData = generateFallbackHints(targetWord);
    }

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
 * Fallback hint generation when AI is unavailable
 */
function generateFallbackHints(targetWord: string): HintGenerationResponse {
  const wordLength = targetWord.length;
  const firstLetter = targetWord[0];
  const lastLetter = targetWord[targetWord.length - 1];

  return {
    hints: [
      {
        level: 1,
        hint: `This is a common ${wordLength}-letter word`,
        unlockCost: 0,
      },
      {
        level: 2,
        hint: `It starts with the letter "${firstLetter}"`,
        unlockCost: 1,
      },
      {
        level: 3,
        hint: `The last letter is "${lastLetter}"`,
        unlockCost: 2,
      },
      {
        level: 4,
        hint: `The first two letters are "${targetWord.substring(0, 2)}"`,
        unlockCost: 3,
      },
      {
        level: 5,
        hint: `Almost there! It begins with "${targetWord.substring(0, Math.ceil(wordLength / 2))}"`,
        unlockCost: 5,
      },
    ],
    category: 'Common Words',
    exampleSentence: `I saw the ${targetWord} yesterday.`,
  };
}

export default router;
