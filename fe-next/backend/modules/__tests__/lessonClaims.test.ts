import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: (code: string) => `game:${code}`,
}));

import { broadcastToRoom } from '../../utils/socketHelpers.js';
import {
  startLessonClaims,
  claimLessonWord,
  lessonClaimsView,
  countPlayingHumans,
  onLessonWordAccepted,
  armLessonClaims,
  type LessonClaimsState,
} from '../lessonClaims';
import { LESSON_CLAIM_BONUS, LESSON_RACE_MAX_SLOTS } from '@/shared/constants/lessonScoring';

const start = (over: Partial<Parameters<typeof startLessonClaims>[0]> = {}) =>
  startLessonClaims({
    placedWords: ['storm', 'shad', 'vert'],
    language: 'en',
    gameMode: 'classic',
    playingHumans: 2,
    roundId: 4,
    teams: null,
    ...over,
  });

const claim = (state: LessonClaimsState, over: Partial<Parameters<typeof claimLessonWord>[1]> = {}) =>
  claimLessonWord(state, {
    word: 'storm',
    username: 'Noa',
    fromLesson: true,
    isBot: false,
    avatar: { emoji: '🦊', color: '#ff0' },
    roundId: 4,
    inProgress: true,
    ...over,
  });

describe('startLessonClaims', () => {
  it('Given a classroom round with 2 playing students and placed words, When it starts, Then every placed word is an open slot', () => {
    const state = start();
    expect(state?.slots.map((s) => s.word)).toEqual(['storm', 'shad', 'vert']);
    expect(lessonClaimsView(state!).claimedCount).toBe(0);
  });

  it('Given only 1 playing student (practice/solo), When it starts, Then there is no race', () => {
    expect(start({ playingHumans: 1 })).toBeNull();
    expect(start({ playingHumans: 0 })).toBeNull();
  });

  it('Given no lesson deck on the board, When it starts, Then there is no race', () => {
    expect(start({ placedWords: [] })).toBeNull();
  });

  it.each(['wheel-rush', 'word-tower', 'crossword', 'wordcraft', 'vocab-quiz'])(
    'Given %s, whose words never reach the shared word handler, When it starts, Then there is no race',
    (gameMode) => {
      expect(start({ gameMode })).toBeNull();
    },
  );

  it.each(['classic', 'blast', 'word-hunt'])('Given %s, When it starts, Then the race is on', (gameMode) => {
    expect(start({ gameMode })).not.toBeNull();
  });

  it('Given more than 12 placed words, When it starts, Then only the first 12 in deck order are slots', () => {
    const words = Array.from({ length: 15 }, (_, i) => `word${String.fromCharCode(97 + i)}`);
    const state = start({ placedWords: words });
    expect(state!.slots).toHaveLength(LESSON_RACE_MAX_SLOTS);
    expect(state!.slots[11].word).toBe(words[11]);
  });

  it('Given the same word twice in different case, When it starts, Then it is one slot', () => {
    expect(start({ placedWords: ['Storm', 'storm', 'shad'] })!.slots).toHaveLength(2);
  });
});

describe('countPlayingHumans', () => {
  it('Given a watching teacher host, 1 student and 2 bots, When counted, Then only the student counts', () => {
    const users = [{ isHost: true }, { isHost: false }, { isBot: true, isHost: false }, { isBot: true, isHost: false }];
    expect(countPlayingHumans(users, true)).toBe(1);
  });

  it('Given a host who plays (no projector), When counted, Then the host counts', () => {
    expect(countPlayingHumans([{ isHost: true }, { isHost: false }], false)).toBe(2);
  });
});

describe('claimLessonWord', () => {
  it('Given an open slot, When a student finds the word, Then they claim it with the bonus and a slim avatar', () => {
    const state = start()!;
    const event = claim(state, { avatar: { emoji: '🦊', color: '#ff0', customAvatar: { big: 'config' } } as never });
    expect(event).toEqual({
      roundId: 4,
      index: 0,
      word: 'storm',
      username: 'Noa',
      avatar: { emoji: '🦊', color: '#ff0' },
      teamId: null,
      claimedCount: 1,
      total: 3,
      bonus: LESSON_CLAIM_BONUS,
    });
  });

  it('Given two students submit the same word in the same tick, When both are processed, Then exactly one claims it', () => {
    const state = start()!;
    const first = claim(state, { username: 'Noa' });
    const second = claim(state, { username: 'Dana' });
    expect(first?.username).toBe('Noa');
    expect(second).toBeNull();
    expect(lessonClaimsView(state).claimedCount).toBe(1);
  });

  it('Given a word that is not from the lesson, When accepted, Then nothing is claimed', () => {
    expect(claim(start()!, { word: 'tram', fromLesson: false })).toBeNull();
  });

  it('Given a bot finds the word, When accepted, Then the slot stays open for a student', () => {
    const state = start()!;
    expect(claim(state, { username: 'Bot', isBot: true })).toBeNull();
    expect(claim(state, { username: 'Noa' })?.username).toBe('Noa');
  });

  it('Given the round has ended, When a late word arrives, Then nothing is claimed', () => {
    expect(claim(start()!, { inProgress: false })).toBeNull();
  });

  it('Given a word from the previous round, When it arrives after the next deal, Then nothing is claimed', () => {
    expect(claim(start({ roundId: 5 })!, { roundId: 4 })).toBeNull();
  });

  it('Given a team round, When a student claims, Then the claim names their team', () => {
    const state = start({ teams: [{ id: 0, memberNames: ['Dana'] }, { id: 1, memberNames: ['noa'] }] })!;
    expect(claim(state, { username: 'Noa' })?.teamId).toBe(1);
  });

  it('Given a Hebrew word placed with a final letter, When a student submits the regular-letter spelling, Then it claims the slot', () => {
    const state = start({ language: 'he', placedWords: ['שלום', 'ספר'] })!;
    const event = claim(state, { word: 'שלומ' });
    expect(event?.index).toBe(0);
    expect(event?.word).toBe('שלום');
  });

  it('Given a word beyond the 12-slot cap, When found, Then it is not claimable', () => {
    const words = Array.from({ length: 13 }, (_, i) => `word${String.fromCharCode(97 + i)}`);
    expect(claim(start({ placedWords: words })!, { word: 'wordm' })).toBeNull();
  });
});

describe('lessonClaimsView', () => {
  it('Given open and claimed slots, When viewed, Then open slots carry only the first letter and length', () => {
    const state = start({ language: 'he', placedWords: ['שלום', 'ספר'] })!;
    claim(state, { word: 'ספר' });
    const view = lessonClaimsView(state);
    expect(view.slots[0]).toEqual({ index: 0, first: 'ש', length: 4, claim: null });
    expect(JSON.stringify(view.slots[0])).not.toContain('שלום');
    expect(view.slots[1].claim?.username).toBe('Noa');
    expect(view).toMatchObject({ roundId: 4, total: 2, claimedCount: 1 });
  });
});

describe('armLessonClaims', () => {
  const users = [
    { username: 'Teacher', isHost: true },
    { username: 'Noa', isHost: false },
    { username: 'Dana', isHost: false },
  ];
  const arm = (game: Record<string, unknown>, over: Record<string, unknown> = {}) =>
    armLessonClaims(game as never, {
      placedWords: ['storm'], language: 'en', gameMode: 'classic', users, hostWatches: true,
      extras: { classroom: { teams: [{ id: 0, memberNames: ['Noa', 'Dana'] }] } },
      ...over,
    });

  it('Given a deal with 2 students, When armed, Then the room holds the race keyed to this round with its teams', () => {
    const game: Record<string, unknown> = { gameSessionId: 7 };
    arm(game);
    const state = game.lessonClaims as LessonClaimsState;
    expect(state.roundId).toBe(7);
    expect(state.teams?.[0].memberNames).toEqual(['Noa', 'Dana']);
  });

  it('Given last round had a race and this deal has 1 student plus the watching teacher, When armed, Then the race is cleared', () => {
    const game: Record<string, unknown> = { gameSessionId: 8, lessonClaims: start() };
    arm(game, { users: users.slice(0, 2) });
    expect(game.lessonClaims).toBeNull();
  });
});

describe('onLessonWordAccepted', () => {
  beforeEach(() => vi.mocked(broadcastToRoom).mockClear());

  const game = (state: LessonClaimsState | null) => ({
    lessonClaims: state,
    gameSessionId: 4,
    gameState: 'in-progress',
    language: 'en',
    users: { Noa: { avatar: { emoji: '🦊' }, isBot: false } },
  });

  it('Given an open slot, When the handler reports the accepted word, Then the room hears the claim and the claimer is paid', () => {
    const g = game(start());
    const bonus = onLessonWordAccepted({} as never, 'ABCD', g as never, { word: 'storm', username: 'Noa', fromLesson: true });
    expect(bonus).toBe(LESSON_CLAIM_BONUS);
    expect(broadcastToRoom).toHaveBeenCalledWith({}, 'game:ABCD', 'lessonWordClaimed', expect.objectContaining({ word: 'storm', username: 'Noa', claimedCount: 1 }));
  });

  it('Given a room with no race, When a word is accepted, Then nothing is sent and nothing paid', () => {
    expect(onLessonWordAccepted({} as never, 'ABCD', game(null) as never, { word: 'storm', username: 'Noa', fromLesson: true })).toBe(0);
    expect(broadcastToRoom).not.toHaveBeenCalled();
  });
});
