/**
 * Classroom crossword through the real socket flow: the teacher's start deals a
 * grid from the lesson, phones race it, a late joiner is seated, and the round
 * ends on the classroom recap built from solved lesson clues.
 */

import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../helpers/socketTestHelper';
import { CROSSWORD_CLASSROOM_EVENTS } from '@/shared/types/crosswordClassroom';

const { lesson, record } = vi.hoisted(() => ({ lesson: { words: [], language: 'en' }, record: { current: null } }));

vi.mock('../../modules/classroomGameManager', async (importOriginal) => ({
  ...(await importOriginal()),
  beginClassroomRound: vi.fn(async () => record.current),
  getClassroomGame: vi.fn(async () => record.current),
  getClassroomGameByCode: vi.fn(async () => record.current),
  updateClassroomGameState: vi.fn().mockResolvedValue(undefined),
  updateClassroomGameStatus: vi.fn().mockResolvedValue(undefined),
  saveClassroomSessionScores: vi.fn().mockResolvedValue(undefined),
  setClassroomGamePlacedVocabulary: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/vocabQuizLessonWords', () => ({
  loadLessonVocabulary: vi.fn(async () => lesson),
  loadLessonVocabularyWords: vi.fn(async () => lesson.words),
}));
vi.mock('../../handlers/classroomGamePersistence', async (importOriginal) => ({
  ...(await importOriginal()),
  persistClassroomGameScores: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../cache/wordCache', () => ({
  getCachedWordValidation: vi.fn().mockResolvedValue(null),
  setCachedWordValidation: vi.fn().mockResolvedValue(undefined),
}));

vi.setConfig({ testTimeout: 60000 });

const TEACHER = 'Teacher';
const ANA = 'Ana';
const BEN = 'Ben';
const KIM = 'Kim';

const EN_LESSON = [
  { word: 'planet', definition: 'A world that circles a star' },
  { word: 'orbit', definition: 'The path around a star' },
  { word: 'comet', definition: 'An icy visitor with a tail' },
  { word: 'moon', definition: 'It circles the Earth' },
  { word: 'galaxy', definition: 'A huge group of stars' },
  { word: 'nebula' },
];
const HE_LESSON = [
  { word: 'שלום', definition: 'ברכה' },
  { word: 'מלך', definition: 'שליט' },
  { word: 'לחם', definition: 'מאפה' },
  { word: 'כלב', definition: 'נובח' },
];

const getGame = (code) => globalThis.__gameStateManager.getGame(code);
const lastEvent = (socket, name) => {
  const evs = socket.getEmittedEventsByName(name);
  return evs.length ? evs[evs.length - 1].data : undefined;
};
const dump = (socket) => socket.getEmittedEvents().map((e) => e.event).slice(-25).join(' | ');

function shimIo(io) {
  const origTo = io.to.bind(io);
  io.to = (room) => {
    const target = origTo(room);
    return { ...target, volatile: { emit: target.emit } };
  };
  io.in = io.to;
  io.sockets.sockets = io.sockets;
}
function shimSocket(socket, io) {
  socket.to = (room) => ({
    emit: (event, data) => {
      for (const s of io._getSocketsInRoom(room)) if (s !== socket) s.emit(event, data);
    },
  });
  return socket;
}

async function classroomLobby(env, words, language = 'en') {
  lesson.words = words;
  lesson.language = language;
  const host = shimSocket(env.createSocket(), env.io);
  const gameData = env.createGameData({ hostUsername: TEACHER, language });
  await host.receiveEvent('createGame', gameData);
  const { gameCode } = gameData;
  getGame(gameCode).isClassroom = true;
  record.current = {
    gameCode, classroomId: 'c1', teacherId: 't1', teacherName: 'Ms T', lessonIds: ['l1'], lessonNames: ['Space'],
    vocabularyWords: words.map((w) => w.word), language, settings: { gameMode: 'crossword' }, players: [], status: 'waiting',
    createdAt: new Date().toISOString(),
  };
  const phones = [];
  for (const username of [ANA, BEN]) {
    const s = shimSocket(env.createSocket(), env.io);
    await s.receiveEvent('join', env.createJoinData(gameCode, { username }));
    expect(lastEvent(s, 'joined')?.success, dump(s)).toBe(true);
    phones.push(s);
  }
  return { host, phones, gameCode };
}

async function start(host, phones, gameCode, language = 'en') {
  await host.receiveEvent('startGame', { timerSeconds: 120, language, gameMode: 'crossword' });
  const hostStart = lastEvent(host, 'startGame');
  expect(hostStart?.gameMode, dump(host)).toBe('crossword');
  await host.receiveEvent('countdownComplete', { messageId: hostStart.messageId });
  for (const s of phones) await s.receiveEvent('countdownComplete', { messageId: lastEvent(s, 'startGame').messageId });
}

describe('classroom crossword (real socket flow)', () => {
  let env;

  beforeAll(async () => {
    const { ensureLanguageLoaded } = await import('../../dictionary');
    await ensureLanguageLoaded('en');
    await ensureLanguageLoaded('he');
  });

  beforeEach(() => {
    env = createTestEnvironment();
    shimIo(env.io);
    globalThis.__resetBroadcastThrottle?.();
  });

  afterEach(() => {
    globalThis.__clearAllGameTimers?.();
    env.cleanup();
    record.current = null;
  });

  it('deals the lesson grid to the phones, seats a late joiner, and ends on the recap from solved clues', async () => {
    const { host, phones: [ana, ben], gameCode } = await classroomLobby(env, EN_LESSON);
    await start(host, [ana, ben], gameCode);

    const init = lastEvent(ana, 'crosswordMpInit');
    expect(init?.puzzle?.id, dump(ana)).toMatch(/^lesson-/);
    expect(init.players.sort()).toEqual([ANA, BEN]);
    const clues = init.puzzle.slots.map((s) => s.clue);
    for (const clue of clues) expect(EN_LESSON.map((w) => w.definition)).toContain(clue);
    const bySlot = getGame(gameCode).crosswordMpState.lessonWordBySlot;

    const kim = shimSocket(env.createSocket(), env.io);
    await kim.receiveEvent('join', env.createJoinData(gameCode, { username: KIM }));
    await kim.receiveEvent('requestCrosswordMpState');
    expect(lastEvent(kim, 'crosswordMpInit')?.puzzle?.id).toBe(init.puzzle.id);

    const [firstSlot, secondSlot] = init.puzzle.slots.map((s) => s.id);
    await ana.receiveEvent('submitCrosswordProgress', { percent: 40, solved: false, elapsedMs: 9000, score: 0, solvedSlotIds: [firstSlot] });
    await kim.receiveEvent('submitCrosswordProgress', { percent: 20, solved: false, elapsedMs: 5000, score: 0, solvedSlotIds: [secondSlot] });

    const results = host.waitForEvent('validatedScores', 15000);
    await host.receiveEvent('endGame');
    const { data } = await results;
    const summary = data.classroomSummary;
    expect(summary, JSON.stringify(Object.keys(data))).toBeDefined();
    const foundBy = Object.fromEntries(summary.coverage.map((c) => [c.word, c.foundBy]));
    expect(foundBy[bySlot[firstSlot]]).toEqual([ANA]);
    expect(foundBy[bySlot[secondSlot]]).toEqual([KIM]);
    expect(summary.neverPlacedWords).toContain('nebula');
  });

  it('a lesson too small for a grid leaves the room in the lobby and tells the teacher', async () => {
    const { host, phones, gameCode } = await classroomLobby(env, EN_LESSON.slice(0, 2));
    await host.receiveEvent('startGame', { timerSeconds: 120, language: 'en', gameMode: 'crossword' });
    expect(getGame(gameCode).gameState).toBe('waiting');
    expect(lastEvent(phones[0], 'startGame')).toBeUndefined();
    expect(lastEvent(host, CROSSWORD_CLASSROOM_EVENTS.startRefused)).toMatchObject({ gameCode, reason: 'tooFewWords', usableWords: 2 });
  });

  it('a Hebrew lesson deals a right-to-left grid of the lesson words', async () => {
    const { host, phones, gameCode } = await classroomLobby(env, HE_LESSON, 'he');
    await start(host, phones, gameCode, 'he');
    const init = lastEvent(phones[0], 'crosswordMpInit');
    expect(init?.puzzle?.rtl, dump(phones[0])).toBe(true);
    const placed = Object.values(getGame(gameCode).crosswordMpState.lessonWordBySlot);
    for (const w of placed) expect(HE_LESSON.map((x) => x.word)).toContain(w);
  });
});
