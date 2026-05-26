import { describe, it, expect } from 'vitest';
import {
  initialSpState,
  requiredHead,
  commitPlayerWord,
  commitBotWord,
  playerGivesUp,
} from '../spEngine';

describe('SP shiritori engine — initial state', () => {
  it('seeds chain with the opening word and gives player the turn', () => {
    const s = initialSpState('ねこ');
    expect(s.chain).toEqual(['ねこ']);
    expect(s.used.has('ねこ')).toBe(true);
    expect(s.turn).toBe('player');
    expect(s.phase).toBe('playing');
    expect(requiredHead(s)).toBe('こ');
  });
});

describe('SP shiritori engine — player commit', () => {
  it('accepts a legal chain word and passes turn to bot', () => {
    const s = initialSpState('ねこ');
    const r = commitPlayerWord(s, 'こま', true);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.state.turn).toBe('bot');
      expect(r.state.chain).toEqual(['ねこ', 'こま']);
      expect(requiredHead(r.state)).toBe('ま');
    }
  });

  it('rejects a duplicate', () => {
    const s = initialSpState('ねこ');
    const r = commitPlayerWord(s, 'ねこ', true);
    expect(r.kind).toBe('err');
    if (r.kind === 'err') expect(r.reason).toBe('duplicate');
  });

  it('rejects wrong head', () => {
    const s = initialSpState('ねこ');
    const r = commitPlayerWord(s, 'いぬ', true);
    expect(r.kind).toBe('err');
    if (r.kind === 'err') expect(r.reason).toBe('wrong-head');
  });

  it('rejects non-hiragana input', () => {
    const s = initialSpState('ねこ');
    const r = commitPlayerWord(s, 'COMA', true);
    expect(r.kind).toBe('err');
    if (r.kind === 'err') expect(r.reason).toBe('not-hiragana');
  });

  it('rejects a word missing from the dictionary', () => {
    const s = initialSpState('ねこ');
    const r = commitPlayerWord(s, 'こめあ', false); // chains but not in dict
    expect(r.kind).toBe('err');
    if (r.kind === 'err') expect(r.reason).toBe('not-in-dict');
  });

  it('flags loss when player word ends in ん', () => {
    const s2 = initialSpState('ねこ');
    const r = commitPlayerWord(s2, 'こばん', true);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.state.phase).toBe('lost');
      expect(r.state.endReason).toBe('player-ends-n');
    }
  });
});

describe('SP shiritori engine — bot commit', () => {
  it('bot picking null = player wins', () => {
    const s = initialSpState('ねこ');
    const s2 = commitBotWord({ ...s, turn: 'bot' }, null);
    expect(s2.phase).toBe('won');
    expect(s2.endReason).toBe('bot-no-move');
  });

  it('bot ending in ん = player wins', () => {
    const s = initialSpState('ねこ');
    const s2 = commitBotWord({ ...s, turn: 'bot' }, 'こん');
    expect(s2.phase).toBe('won');
    expect(s2.endReason).toBe('bot-ends-n');
  });

  it('legal bot word passes turn back to player', () => {
    const s = initialSpState('ねこ');
    const s2 = commitBotWord({ ...s, turn: 'bot' }, 'こま');
    expect(s2.phase).toBe('playing');
    expect(s2.turn).toBe('player');
    expect(s2.chain).toEqual(['ねこ', 'こま']);
  });
});

describe('SP shiritori engine — give up', () => {
  it('player give-up sets phase=lost with reason no-move', () => {
    const s = playerGivesUp(initialSpState('ねこ'));
    expect(s.phase).toBe('lost');
    expect(s.endReason).toBe('player-no-move');
  });
});
