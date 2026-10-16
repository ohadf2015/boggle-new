/** Zod payload schemas for the classroom game socket events. */

import { z } from 'zod';
import { gameCodeSchema, usernameSchema } from '../utils/socketValidation.js';
import { CLASSROOM_BOSS_IDS } from '@/shared/types/classroomBoss';

// ==========================================
// Zod Schemas for classroom events
// ==========================================

export const classroomIdSchema = z.string()
  .uuid('classroomId must be a valid UUID');

export const createClassroomGameSchema = z.object({
  classroomId: classroomIdSchema,
  teacherId: z.string().uuid('teacherId must be a valid UUID'),
  teacherName: usernameSchema,
  gameCode: gameCodeSchema,
  lessonIds: z.array(z.string().uuid()).max(20).optional(),
  lessonNames: z.array(z.string().max(200)).max(20).optional(),
  vocabularyWords: z.array(z.string().max(100)).max(500).optional(),
  /** The selected word list's language; re-resolved server-side against the class and the words. */
  language: z.string().max(8).optional(),
  settings: z.object({
    timerMinutes: z.number().int().min(1).max(30).optional(),
    boardSize: z.enum(['small', 'medium', 'large']).optional(),
    allowLateJoin: z.boolean().optional(),
    gameMode: z.enum(['classic', 'blast', 'word-hunt', 'wheel-rush', 'vocab-quiz', 'wordcraft']).optional(),
    vocabQuizVariant: z.enum(['classic', 'boss']).optional(),
    classroomBossId: z.enum(CLASSROOM_BOSS_IDS).optional(),
    // Word Hunt: teacher-pinned target. Length/charset is re-checked against the
    // lesson at game start (shared/utils/classroomHuntTarget), so this bound is
    // only a payload-size guard.
    targetWord: z.string().max(100).optional(),
    // Vocab Quiz: the skill drilled and the round shape. All three are
    // re-clamped in the engine against what the lesson can actually build, so
    // these bounds are a payload guard, not the real limits.
    vocabQuizFocus: z
      .enum(['any', 'definition', 'synonym', 'antonym', 'context', 'multiple_meaning', 'roots_affixes'])
      .optional(),
    vocabQuizQuestionCount: z.number().int().min(4).max(30).optional(),
    vocabQuizSeconds: z.number().int().min(5).max(90).optional(),
    treasureChestsEnabled: z.boolean().optional(),
    // Team battle (weekly teams / juegos en equipo).
    playStyle: z.enum(['ffa', 'teams']).optional(),
    teamCount: z.number().int().min(2).max(4).optional(),
    // SPED-friendly accommodations.
    accessibility: z.object({
      largeText: z.boolean().optional(),
      audioCues: z.boolean().optional(),
      participationPoints: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

export const startClassroomGameSchema = z.object({
  gameCode: gameCodeSchema,
});

export const getActiveGamesSchema = z.object({
  classroomId: classroomIdSchema,
});

export const joinClassroomGameSchema = z.object({
  gameCode: gameCodeSchema,
  userId: z.string().uuid('userId must be a valid UUID'),
  username: usernameSchema,
});

export const leaveClassroomGameSchema = z.object({
  gameCode: gameCodeSchema,
  userId: z.string().uuid('userId must be a valid UUID'),
});
