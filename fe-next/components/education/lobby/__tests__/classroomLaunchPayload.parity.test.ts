import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildClassroomLaunchPayload, splitLaunchPayload, type ClassroomLaunchInput } from '../classroomLaunchPayload';
import { createClassroomGameSchema } from '@/backend/handlers/classroomGameSchemas';

const CLASSROOM_ID = '7b0c4a52-3f1e-4c55-9d0e-1a2b3c4d5e6f';
const TEACHER_ID = '0f9e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f';
const LESSON_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const WORDS = ['apple', 'river', 'stone', 'cloud', 'tiger', 'plant'];
const wire = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** What the lobby sends when every dial is left on its first-visit default. */
const LOBBY_DEFAULTS: ClassroomLaunchInput = {
  gameCode: 'ABC234',
  classroomId: CLASSROOM_ID,
  teacherId: TEACHER_ID,
  teacherName: 'Ms Cohen',
  lessonIds: [LESSON_ID],
  lessonNames: ['Unit 4'],
  vocabularyWords: WORDS,
  language: 'he',
  mode: 'classic',
  timerMinutes: 3,
  boardSize: 'medium',
  allowLateJoin: true,
  playStyle: 'ffa',
  accessibility: { largeText: false, audioCues: false, participationPoints: false },
};

describe('classroom launch payload', () => {
  it('Given a classic launch at defaults, Then the wire payload matches the hand-written fixture', () => {
    expect(wire(splitLaunchPayload(buildClassroomLaunchPayload(LOBBY_DEFAULTS)).createPayload)).toEqual({
      gameCode: 'ABC234',
      classroomId: CLASSROOM_ID,
      teacherId: TEACHER_ID,
      teacherName: 'Ms Cohen',
      lessonIds: [LESSON_ID],
      lessonNames: ['Unit 4'],
      vocabularyWords: WORDS,
      language: 'he',
      settings: { timerMinutes: 3, boardSize: 'medium', allowLateJoin: true, gameMode: 'classic', playStyle: 'ffa' },
    });
  });

  it('Given a quiz launch, Then the quiz fields ride along and a board launch drops them', () => {
    const quiz = { focus: 'any' as const, questionCount: 10, seconds: 20 };
    const asQuiz = wire(splitLaunchPayload(buildClassroomLaunchPayload({ ...LOBBY_DEFAULTS, mode: 'vocab-quiz', quiz })).createPayload);
    const asBoard = wire(splitLaunchPayload(buildClassroomLaunchPayload({ ...LOBBY_DEFAULTS, mode: 'blast', quiz })).createPayload);
    expect(asQuiz.settings).toMatchObject({ vocabQuizFocus: 'any', vocabQuizQuestionCount: 10, vocabQuizSeconds: 20 });
    expect(asBoard.settings.vocabQuizFocus).toBeUndefined();
  });

  it('Given Pro pressure dials, When split, Then they leave the create payload and come back separately', () => {
    const pressure = { calm: true } as never;
    const { createPayload, pressure: peeled } = splitLaunchPayload(buildClassroomLaunchPayload({ ...LOBBY_DEFAULTS, pressure }));
    expect(peeled).toBe(pressure);
    expect('pressure' in createPayload.settings).toBe(false);
  });

  it('Given team play and accessibility, Then teams are clamped and only a switched-on accessibility set is sent', () => {
    const { createPayload } = splitLaunchPayload(
      buildClassroomLaunchPayload({ ...LOBBY_DEFAULTS, playStyle: 'teams', teamCount: 9, accessibility: { largeText: true, audioCues: false, participationPoints: false } }),
    );
    expect(createPayload.settings.teamCount).toBe(4);
    expect(createPayload.settings.accessibility).toEqual({ largeText: true, audioCues: false, participationPoints: false });
    expect(splitLaunchPayload(buildClassroomLaunchPayload(LOBBY_DEFAULTS)).createPayload.settings.accessibility).toBeUndefined();
  });

  it('Given every payload shape, When the server schema parses it, Then no key is stripped', () => {
    const shapes = [
      splitLaunchPayload(buildClassroomLaunchPayload({ ...LOBBY_DEFAULTS, mode: 'vocab-quiz', quiz: { focus: 'any', questionCount: 10, seconds: 20 } })).createPayload,
      splitLaunchPayload(buildClassroomLaunchPayload({ ...LOBBY_DEFAULTS, playStyle: 'teams', teamCount: 3, targetWord: 'apple', bossId: undefined, economy: { wrongAnswerCost: true, powerUps: true } })).createPayload,
    ];
    for (const shape of shapes) expect(createClassroomGameSchema.parse(wire(shape))).toEqual(wire(shape));
  });

  it('Given the lobby, Then it builds through the shared builder and only the launch hook emits a room', () => {
    const root = path.resolve(__dirname, '..', '..');
    expect(fs.readFileSync(path.join(root, 'ClassroomGameLobby.tsx'), 'utf8')).toMatch(/buildClassroomLaunchPayload\(/);
    expect(fs.readFileSync(path.join(root, 'ClassroomGameLobby.tsx'), 'utf8')).not.toMatch(/createClassroomGame/);
    expect(fs.readFileSync(path.join(root, 'lobby', 'useClassroomLaunchSocket.ts'), 'utf8')).toMatch(/splitLaunchPayload\(/);
    expect(fs.existsSync(path.join(root, 'ClassroomGameLobbyExpress.tsx'))).toBe(false);
  });
});
