import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildClassroomLaunchPayload, splitLaunchPayload, type ClassroomLaunchInput } from '../classroomLaunchPayload';
import { prepareQuickLaunch, type QuickLaunchDeps } from '../../ClassroomGameLobbyExpressRunner';
import { createClassroomGameSchema } from '@/backend/handlers/classroomGameSchemas';

const CLASSROOM_ID = '7b0c4a52-3f1e-4c55-9d0e-1a2b3c4d5e6f';
const TEACHER_ID = '0f9e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f';
const LESSON_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const WORDS = ['apple', 'river', 'stone', 'cloud', 'tiger', 'plant'];
const wire = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

async function expressPayload(mode?: 'classic' | 'vocab-quiz') {
  const lesson = { id: LESSON_ID, name: 'Unit 4', language: 'he', words: WORDS.map((word) => ({ word, definition: `${word} def` })) };
  const deps = {
    userId: TEACHER_ID,
    teacherName: 'Ms Cohen',
    gameCode: 'ABC234',
    defaultClassName: 'My Class',
    uiLanguage: 'en',
    modeOverride: mode,
    listClassrooms: vi.fn(async () => [{ id: CLASSROOM_ID, name: '5B', language: 'he' }]),
    createClassroom: vi.fn(),
    getLessonById: vi.fn(async () => lesson),
    createLesson: vi.fn(),
    onStage: vi.fn(),
  } as unknown as QuickLaunchDeps;
  const result = await prepareQuickLaunch(deps, { source: 'lesson', lessonId: LESSON_ID, title: 'Unit 4', language: 'he', createdAt: 0 });
  if (!result.ok) throw new Error('express launch failed');
  return result.payload;
}

/** What the full lobby sends when the teacher leaves every dial where Express puts it. */
const LOBBY_AT_EXPRESS_DEFAULTS: ClassroomLaunchInput = {
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
  it('Given the Express runner, When it builds a classic launch, Then the wire payload matches the hand-written fixture', async () => {
    expect(wire(splitLaunchPayload(await expressPayload('classic')).createPayload)).toEqual({
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

  it('Given the full lobby at Express defaults, When both payloads are compared field by field, Then only the lobby economy switches differ', async () => {
    const lobby = wire(splitLaunchPayload(buildClassroomLaunchPayload({ ...LOBBY_AT_EXPRESS_DEFAULTS, economy: { wrongAnswerCost: false, powerUps: true } })).createPayload);
    const express = wire(splitLaunchPayload(await expressPayload('classic')).createPayload);
    const { economy, ...lobbySettings } = lobby.settings;
    expect(economy).toEqual({ wrongAnswerCost: false, powerUps: true });
    expect({ ...lobby, settings: lobbySettings }).toEqual(express);
  });

  it('Given a quiz launch from either path, Then the quiz fields ride in both and nothing else differs', async () => {
    const express = wire(splitLaunchPayload(await expressPayload('vocab-quiz')).createPayload);
    const lobby = wire(
      splitLaunchPayload(
        buildClassroomLaunchPayload({ ...LOBBY_AT_EXPRESS_DEFAULTS, mode: 'vocab-quiz', quiz: { focus: 'any', questionCount: express.settings.vocabQuizQuestionCount!, seconds: express.settings.vocabQuizSeconds! } }),
      ).createPayload,
    );
    expect(lobby).toEqual(express);
    expect(express.settings.vocabQuizFocus).toBe('any');
  });

  it('Given Pro pressure dials, When split, Then they leave the create payload and come back separately', () => {
    const pressure = { calm: true } as never;
    const { createPayload, pressure: peeled } = splitLaunchPayload(buildClassroomLaunchPayload({ ...LOBBY_AT_EXPRESS_DEFAULTS, pressure }));
    expect(peeled).toBe(pressure);
    expect('pressure' in createPayload.settings).toBe(false);
  });

  it('Given team play and accessibility, Then teams are clamped and only a switched-on accessibility set is sent', () => {
    const { createPayload } = splitLaunchPayload(
      buildClassroomLaunchPayload({ ...LOBBY_AT_EXPRESS_DEFAULTS, playStyle: 'teams', teamCount: 9, accessibility: { largeText: true, audioCues: false, participationPoints: false } }),
    );
    expect(createPayload.settings.teamCount).toBe(4);
    expect(createPayload.settings.accessibility).toEqual({ largeText: true, audioCues: false, participationPoints: false });
    expect(splitLaunchPayload(buildClassroomLaunchPayload(LOBBY_AT_EXPRESS_DEFAULTS)).createPayload.settings.accessibility).toBeUndefined();
  });

  it('Given every payload shape, When the server schema parses it, Then no key is stripped', async () => {
    const shapes = [
      splitLaunchPayload(await expressPayload('vocab-quiz')).createPayload,
      splitLaunchPayload(buildClassroomLaunchPayload({ ...LOBBY_AT_EXPRESS_DEFAULTS, playStyle: 'teams', teamCount: 3, targetWord: 'apple', bossId: undefined, economy: { wrongAnswerCost: true, powerUps: true } })).createPayload,
    ];
    for (const shape of shapes) expect(createClassroomGameSchema.parse(wire(shape))).toEqual(wire(shape));
  });

  it('Given the two lobby files, Then both launch through the shared builder', () => {
    const root = path.resolve(__dirname, '..', '..');
    expect(fs.readFileSync(path.join(root, 'ClassroomGameLobby.tsx'), 'utf8')).toMatch(/buildClassroomLaunchPayload\(/);
    expect(fs.readFileSync(path.join(root, 'ClassroomGameLobbyExpressRunner.ts'), 'utf8')).toMatch(/buildClassroomLaunchPayload\(/);
    expect(fs.readFileSync(path.join(root, 'ClassroomGameLobbyExpress.tsx'), 'utf8')).toMatch(/splitLaunchPayload\(/);
    expect(fs.readFileSync(path.join(root, 'lobby', 'useClassroomLaunchSocket.ts'), 'utf8')).toMatch(/splitLaunchPayload\(/);
  });
});
