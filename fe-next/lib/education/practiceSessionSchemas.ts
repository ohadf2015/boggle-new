import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VOCAB_FOCUSES } from '@/lib/education/vocabFocus';
import { WORDCRAFT_SESSION_MODE } from '@/lib/education/wordcraftAssignment';
import { REVIEW_KINDS } from '@/lib/education/wordMemory';

/** Request validation for /api/education/practice (a route file may export only its handlers). */
export function tooManyRequests(retryAfter: number | undefined) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
  );
}

// Validation schemas
const practiceTypeSchema = z.enum(['flashcard', 'solo_board', 'warmup', 'word_list', 'matching', 'spelling', 'blitz', 'vocab_focus']);
const vocabFocusSchema = z.enum(VOCAB_FOCUSES as [string, ...string[]]);

export const startSessionSchema = z.object({
  lessonId: z.string().uuid(),
  practiceType: practiceTypeSchema,
  // vocab_focus only — which skill is drilled; persisted in `mode` + `results.focus`
  focus: vocabFocusSchema.optional(),
  // solo_board only: Word Craft (no 'wordcraft' in the practice_type CHECK) → `mode`
  variant: z.literal(WORDCRAFT_SESSION_MODE).optional(),
});

export const updateSessionSchema = z.object({
  sessionId: z.string().uuid(),
  // Flashcard updates
  cardsReviewed: z.number().min(0).optional(),
  cardsCorrect: z.number().min(0).optional(),
  // Board practice updates
  wordsFound: z.array(z.string()).optional(),
  vocabularyWordsFound: z.array(z.string()).optional(),
  totalScore: z.number().min(0).optional(),
  // New practice modes (Phase 37)
  wordsAttempted: z.number().min(0).optional(),
  wordsCorrect: z.number().min(0).optional(),
  accuracy: z.number().min(0).max(1).optional(),
  maxCombo: z.number().min(0).optional(),
  // xpAwarded removed (B7 fix) — server always computes XP, never trusts client
  // Per-word answers for the word memory; the server matches each word to the session's lesson and caps the count.
  wordResults: z
    .array(
      z.object({
        word: z.string().min(1).max(64),
        correct: z.boolean(),
        kind: z.enum(REVIEW_KINDS),
        ms: z.number().int().min(0).max(600_000).optional(),
      }),
    )
    .max(1000)
    .optional(),
  // Common
  timeSpentSeconds: z.number().min(0).optional(),
  completed: z.boolean().optional(),
});

export const getProgressSchema = z.object({
  lessonId: z.string().uuid(),
  studentId: z.string().uuid().optional(), // For teachers viewing student progress
});
