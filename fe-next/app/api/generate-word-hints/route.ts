/**
 * API Route: /api/generate-word-hints
 * Generates progressive hints for Word Hunt Survival Mode using Vertex AI
 * Uses Node.js runtime for Vertex AI SDK
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Rate limit config: 50 requests per minute per IP
const RATE_LIMIT_CONFIG = {
  maxRequests: 50,
  windowMs: 60000,
  blockDurationMs: 300000, // 5 min block if abused
};

// Input validation schema
const generateHintsSchema = z.object({
  targetWord: z.string().min(2).max(20).regex(/^[a-zA-Z\u0590-\u05FF\u3040-\u30FF\u4E00-\u9FAF\u00C0-\u017F]+$/),
  language: z.enum(['en', 'he', 'sv', 'ja', 'es', 'ru', 'fr', 'de']).default('en'),
});

// Language configuration for vowels and alphabet
const LANGUAGE_CONFIG: Record<string, { name: string; vowels: string[]; alphabet: string }> = {
  en: {
    name: 'English',
    vowels: ['A', 'E', 'I', 'O', 'U'],
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  he: {
    name: 'Hebrew',
    vowels: ['א', 'ע', 'י', 'ו'],
    alphabet: 'אבגדהוזחטיכלמנסעפצקרשת'
  },
  sv: {
    name: 'Swedish',
    vowels: ['A', 'E', 'I', 'O', 'U', 'Y', 'Å', 'Ä', 'Ö'],
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'
  },
  ja: {
    name: 'Japanese',
    vowels: ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'],
    alphabet: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'
  },
  es: {
    name: 'Spanish',
    vowels: ['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú'],
    alphabet: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'
  },
  fr: {
    name: 'French',
    vowels: ['A', 'E', 'I', 'O', 'U', 'Y', 'À', 'Â', 'É', 'È', 'Ê', 'Ë', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Ÿ'],
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  },
  de: {
    name: 'German',
    vowels: ['A', 'E', 'I', 'O', 'U', 'Ä', 'Ö', 'Ü'],
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß'
  },
};

// Hint unlock costs
const HINT_UNLOCK_COSTS = {
  LEVEL_1: 0,
  LEVEL_2: 4,
  LEVEL_3: 8,
  LEVEL_4: 12,
  LEVEL_5: 16,
} as const;

interface HintLevel {
  level: number;
  hint: string;
  unlockCost: number;
}

interface HintGenerationResponse {
  hints: HintLevel[];
  category: string;
  exampleSentence: string;
  wordType?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  lettersToEliminate?: string[];
  tokenUsage?: {
    input: number;
    output: number;
  };
}

// Algorithmic hint generation functions
function findVowelPositions(word: string, language: string): number[] {
  const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const vowelSet = new Set(config.vowels.map(v => v.toUpperCase()));
  const positions: number[] = [];

  for (let i = 0; i < word.length; i++) {
    if (vowelSet.has(word[i].toUpperCase())) {
      positions.push(i);
    }
  }

  return positions;
}

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

function calculateRevealOrder(word: string, language: string): number[] {
  const lastPosition = word.length - 1;
  const vowelPositions = findVowelPositions(word, language);
  const vowelsFromEnd = [...vowelPositions]
    .filter(i => i !== lastPosition)
    .sort((a, b) => b - a);
  const consonantPositions = [...Array(word.length).keys()]
    .filter(i => !vowelPositions.includes(i) && i !== lastPosition)
    .sort((a, b) => b - a);

  return [...vowelsFromEnd, ...consonantPositions];
}

function generateAlgorithmicHints(targetWord: string, language: string): HintLevel[] {
  const word = targetWord.toUpperCase();
  const wordLength = word.length;
  const maxReveal = Math.floor(wordLength / 2);
  const lastPosition = wordLength - 1;

  const revealOrder = calculateRevealOrder(word, language);
  const vowelPositions = findVowelPositions(word, language);
  const vowelsExcludingLast = [...vowelPositions]
    .filter(i => i !== lastPosition)
    .sort((a, b) => b - a);

  const hints: HintLevel[] = [];

  // Level 1: All blanks
  hints.push({
    level: 1,
    hint: generateBlanksDisplay(word, []),
    unlockCost: HINT_UNLOCK_COSTS.LEVEL_1,
  });

  // Level 2: Reveal a vowel (excluding last letter), or first letter as fallback
  const level2Positions = vowelsExcludingLast.length > 0
    ? [vowelsExcludingLast[0]]
    : wordLength > 1 ? [0] : [];
  hints.push({
    level: 2,
    hint: generateBlanksDisplay(word, level2Positions),
    unlockCost: HINT_UNLOCK_COSTS.LEVEL_2,
  });

  if (wordLength >= 4) {
    // Level 3: ~25% of max reveal
    const level3Count = Math.min(Math.ceil(maxReveal * 0.5), revealOrder.length);
    const level3Positions = revealOrder.slice(0, level3Count).sort((a, b) => a - b);
    hints.push({
      level: 3,
      hint: generateBlanksDisplay(word, level3Positions),
      unlockCost: HINT_UNLOCK_COSTS.LEVEL_3,
    });

    // Level 4: ~37.5% of max reveal
    const level4Count = Math.min(Math.ceil(maxReveal * 0.75), revealOrder.length);
    const level4Positions = revealOrder.slice(0, level4Count).sort((a, b) => a - b);
    hints.push({
      level: 4,
      hint: generateBlanksDisplay(word, level4Positions),
      unlockCost: HINT_UNLOCK_COSTS.LEVEL_4,
    });

    // Level 5: Exactly 50%
    const level5Positions = revealOrder.slice(0, maxReveal).sort((a, b) => a - b);
    hints.push({
      level: 5,
      hint: generateBlanksDisplay(word, level5Positions),
      unlockCost: HINT_UNLOCK_COSTS.LEVEL_5,
    });
  }

  return hints;
}

function generateFallbackHints(targetWord: string, language: string = 'en'): HintGenerationResponse {
  const hints = generateAlgorithmicHints(targetWord, language);

  const templates: Record<string, string[]> = {
    en: [
      `I saw a beautiful ____ today.`,
      `The ____ was quite impressive.`,
      `Have you ever seen such a ____?`,
    ],
    he: [
      `ראיתי ____ יפה היום.`,
      `ה____ היה מרשים מאוד.`,
    ],
    sv: [
      `Jag såg en vacker ____ idag.`,
      `____ var mycket imponerande.`,
    ],
    ja: [
      `今日、美しい____を見ました。`,
      `その____はとても印象的でした。`,
    ],
    es: [
      `Hoy vi un hermoso ____.`,
      `El ____ era muy impresionante.`,
    ],
    fr: [
      `J'ai vu un beau ____ aujourd'hui.`,
      `Le ____ était très impressionnant.`,
    ],
    de: [
      `Ich habe heute einen schönen ____ gesehen.`,
      `Der ____ war sehr beeindruckend.`,
    ],
  };

  const langTemplates = templates[language] || templates.en;
  const exampleSentence = langTemplates[Math.floor(Math.random() * langTemplates.length)];

  // Generate letters to eliminate
  const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const wordLetterSet = new Set(targetWord.toUpperCase().split(''));
  const lettersToEliminate = config.alphabet
    .split('')
    .filter(l => !wordLetterSet.has(l))
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);

  return {
    hints,
    category: 'Unknown',
    exampleSentence,
    lettersToEliminate,
  };
}

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'generate-word-hints', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  let body: { targetWord?: string; language?: string } | undefined;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      error: 'Invalid request',
      details: ['Invalid request body'],
    }, { status: 400 });
  }

  // Check if body is defined and is a plain object (not null, undefined, or array)
  if (!body || body === null || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({
      error: 'Invalid request',
      details: ['Request body must be a JSON object'],
    }, { status: 400 });
  }

  // Ensure we have an object before Zod validation (additional safety check)
  const bodyObj = body as Record<string, unknown>;

  // Additional runtime safety check for undefined body
  if (bodyObj === undefined || bodyObj === null) {
    return NextResponse.json({
      error: 'Invalid request',
      details: ['Request body is required'],
    }, { status: 400 });
  }

  if (typeof bodyObj.targetWord === 'undefined') {
    return NextResponse.json({
      error: 'Invalid request',
      details: ['targetWord is required'],
    }, { status: 400 });
  }

  // Validate input
  const parseResult = generateHintsSchema.safeParse(bodyObj);
  if (!parseResult.success) {
    return NextResponse.json({
      error: 'Invalid request',
      details: parseResult.error.issues.map(e => e.message),
    }, { status: 400 });
  }

  const { targetWord, language } = parseResult.data;
  const normalizedWord = targetWord.toUpperCase().trim();

  // Generate algorithmic hints (consistent, no AI needed for core hints)
  const response = generateFallbackHints(normalizedWord, language);
  return NextResponse.json(response);
}
