import { describe, it, expect, beforeEach } from 'vitest';
import {
  REHEARSAL_FALLBACK_MODE,
  clearRehearseIntent,
  modeAllowsRehearsalBots,
  peekRehearseIntent,
  realStudentCount,
  writeRehearseIntent,
} from '../rehearsal';

describe('realStudentCount', () => {
  it('Given only bots on the roster, Then no real student has joined', () => {
    expect(realStudentCount([{ username: 'Bot1', isBot: true }, { username: 'Bot2', isBot: true }])).toBe(0);
  });

  it('Given one student beside the bots, Then exactly one real student is counted', () => {
    expect(realStudentCount([{ username: 'Bot1', isBot: true }, { username: 'Ada' }])).toBe(1);
  });
});

describe('modeAllowsRehearsalBots', () => {
  it.each(['word-tower', 'crossword', 'wordcraft', 'vocab-quiz'])('Given %s, Then bots cannot play it', (mode) => {
    expect(modeAllowsRehearsalBots(mode)).toBe(false);
  });

  it.each(['classic', 'blast', 'word-hunt', 'wheel-rush'])('Given %s, Then bots can play it', (mode) => {
    expect(modeAllowsRehearsalBots(mode)).toBe(true);
  });

  it('offers Classic as the stand-in mode, which bots can play', () => {
    expect(REHEARSAL_FALLBACK_MODE).toBe('classic');
    expect(modeAllowsRehearsalBots(REHEARSAL_FALLBACK_MODE)).toBe(true);
  });
});

describe('rehearse intent hand-off', () => {
  beforeEach(() => sessionStorage.clear());

  it('Given the teacher tapped Rehearse, Then the lobby sees the intent until it fires', () => {
    writeRehearseIntent({ source: 'hq', classExists: false }, 1_000);
    expect(peekRehearseIntent(2_000)).toEqual({ source: 'hq', classExists: false });
    expect(peekRehearseIntent(2_001)).toEqual({ source: 'hq', classExists: false });
    clearRehearseIntent();
    expect(peekRehearseIntent(2_002)).toBeNull();
  });

  it('Given no tap, Then the lobby never auto-starts a practice round', () => {
    expect(peekRehearseIntent(1_000)).toBeNull();
  });

  it('Given a tap older than the launch hand-off, Then a lobby opened by hand does not auto-start', () => {
    writeRehearseIntent({ source: 'class', classExists: true }, 0);
    expect(peekRehearseIntent(5 * 60 * 1000 + 1)).toBeNull();
  });

  it('Given a garbled entry, Then it reads as no intent', () => {
    sessionStorage.setItem('lexiclash:rehearse-intent', '{"source":"elsewhere","at":1}');
    expect(peekRehearseIntent(2)).toBeNull();
  });
});
