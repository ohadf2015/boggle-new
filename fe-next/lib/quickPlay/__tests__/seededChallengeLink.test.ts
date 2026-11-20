import { describe, expect, it, vi } from 'vitest';
import {
  RESULTS_LOOP_EVENTS,
  buildSeededChallengeUrl,
  parseSeededChallenge,
  seededRoundRequest,
  startSameRoomRematch,
} from '../seededChallengeLink';

describe('parseSeededChallenge', () => {
  it('reads a signed-out challenge link into the board seed and the score to beat', () => {
    const parsed = parseSeededChallenge(
      'cmode=word-hunt&cseed=seed-x&cscore=540&cpct=68&cname=Maya',
    );
    expect(parsed).toEqual({
      mode: 'word-hunt',
      seed: 'seed-x',
      score: 540,
      scorePct: 68,
      name: 'Maya',
    });
  });

  it('keeps a Hebrew name and a one-decimal percent', () => {
    const parsed = parseSeededChallenge(
      'cmode=classic&cseed=weekly-2026-W47&cscore=12&cpct=68.5&cname=' + encodeURIComponent('מאיה'),
    );
    expect(parsed?.name).toBe('מאיה');
    expect(parsed?.scorePct).toBe(68.5);
    expect(parsed?.seed).toBe('weekly-2026-W47');
  });

  it('returns null when the seed is missing, so the hub cannot invent a board', () => {
    expect(parseSeededChallenge('cmode=classic&cscore=10&cpct=50')).toBeNull();
  });

  it('rejects a mode, seed, or score that would not regenerate a real board', () => {
    expect(parseSeededChallenge('cmode=education&cseed=seed-x&cscore=1&cpct=1')).toBeNull();
    expect(parseSeededChallenge('cmode=classic&cseed=' + 'a'.repeat(65) + '&cscore=1&cpct=1')).toBeNull();
    expect(parseSeededChallenge('cmode=classic&cseed=../etc&cscore=1&cpct=1')).toBeNull();
    expect(parseSeededChallenge('cmode=classic&cseed=seed-x&cscore=-1&cpct=1')).toBeNull();
    expect(parseSeededChallenge('cmode=classic&cseed=seed-x&cscore=1&cpct=101')).toBeNull();
    expect(parseSeededChallenge('')).toBeNull();
  });
});

describe('seeded round request', () => {
  it('seeds the round the recipient will play from the parsed link, with no account', () => {
    const parsed = parseSeededChallenge('cmode=classic&cseed=shared-seed&cscore=90&cpct=40');
    expect(parsed).not.toBeNull();
    expect(seededRoundRequest(parsed!, 'he')).toEqual({
      mode: 'classic',
      language: 'he',
      seed: 'shared-seed',
    });
  });
});

describe('buildSeededChallengeUrl', () => {
  it('round-trips a guest share into a playable link', () => {
    const url = buildSeededChallengeUrl({
      origin: 'https://www.lexiclash.live',
      locale: 'he',
      mode: 'blast',
      seed: 'seed-x',
      score: 200,
      scorePct: 55,
      name: 'Maya',
    });
    expect(url).toContain('/he/quick-play?');
    expect(url).toContain('cseed=seed-x');
    expect(url).toContain('utm_campaign=challenge');
    expect(parseSeededChallenge(new URL(url).searchParams)?.seed).toBe('seed-x');
    expect(parseSeededChallenge(new URL(url).searchParams)?.score).toBe(200);
  });

  it('keeps an existing challenge row id without making the seed depend on it', () => {
    const url = buildSeededChallengeUrl({
      origin: 'https://www.lexiclash.live',
      locale: 'en',
      mode: 'classic',
      seed: 'seed-x',
      score: 10,
      scorePct: 20,
      challengeId: 'ch-1',
    });
    const params = new URL(url).searchParams;
    expect(params.get('challenge')).toBe('ch-1');
    expect(parseSeededChallenge(params)?.seed).toBe('seed-x');
  });
});

describe('startSameRoomRematch', () => {
  it('fires rematch_started and then the room start, for host and joiner', () => {
    const capture = vi.fn();
    const start = vi.fn();
    startSameRoomRematch('host', start, capture);
    startSameRoomRematch('player', start, capture);
    expect(capture).toHaveBeenNthCalledWith(1, RESULTS_LOOP_EVENTS.rematch, {
      surface: 'mp_results',
      role: 'host',
    });
    expect(capture).toHaveBeenNthCalledWith(2, RESULTS_LOOP_EVENTS.rematch, {
      surface: 'mp_results',
      role: 'player',
    });
    expect(start).toHaveBeenCalledTimes(2);
    expect(RESULTS_LOOP_EVENTS.created).toBe('challenge_created');
    expect(RESULTS_LOOP_EVENTS.opened).toBe('challenge_opened');
  });
});
