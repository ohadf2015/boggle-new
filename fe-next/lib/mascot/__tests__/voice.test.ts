import { describe, it, expect } from 'vitest';
import { voiceLineFor, pickVoice, createVoiceHistory, VOICE_CHANCE, SIGNATURE_CRY, isBigMoment } from '../voice';

const always = () => 0;
const never = () => 0.99;

describe('voiceLineFor', () => {
  it('matches each reaction to a voice line', () => {
    expect(voiceLineFor('cheer')).toBe('mascotCheer');
    expect(voiceLineFor('wow')).toBe('mascotCheer');
    expect(voiceLineFor('dancing')).toBe('mascotGiggle');
    expect(voiceLineFor('sad-supportive')).toBe('mascotAww');
    expect(voiceLineFor('exhausted')).toBe('mascotAww');
    expect(voiceLineFor('oh')).toBe('mascotGasp');
    expect(voiceLineFor('idle')).toBeNull();
  });
});

describe('signature cry', () => {
  it("is the mascot's own recorded cry", () => {
    expect(SIGNATURE_CRY.sound).toBe('gagMascotCry');
  });

  it('long words and an unhinged combo are big moments', () => {
    expect(isBigMoment('awe')).toBe(true);
    expect(isBigMoment('unhinged')).toBe(true);
    expect(isBigMoment('cheer')).toBe(false);
  });

  it('a big moment always cries, without the 1-in-3 roll', () => {
    const { voice } = pickVoice('awe', createVoiceHistory(), never);
    expect(voice).toEqual(SIGNATURE_CRY);
  });
});

describe('pickVoice', () => {
  it('voices a reaction when the roll is under the chance', () => {
    expect(pickVoice('cheer', createVoiceHistory(), always).voice).toEqual({ sound: 'mascotCheer', rate: 1 });
  });

  it('stays silent when the roll misses', () => {
    const { voice, history } = pickVoice('cheer', createVoiceHistory(), never);
    expect(voice).toBeNull();
    expect(history.lastVoiced).toBe(false);
  });

  it('never voices two reactions in a row, big moments included', () => {
    const first = pickVoice('cheer', createVoiceHistory(), always);
    const second = pickVoice('awe', first.history, always);
    expect(second.voice).toBeNull();
    expect(pickVoice('awe', second.history, always).voice).toEqual(SIGNATURE_CRY);
  });

  it('voices roughly one ordinary reaction in three', () => {
    let s = 1;
    const rng = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    let history = createVoiceHistory();
    let voiced = 0;
    for (let i = 0; i < 3000; i++) {
      const r = pickVoice('cheer', history, rng);
      history = r.history;
      if (r.voice) voiced++;
    }
    expect(VOICE_CHANCE).toBeCloseTo(1 / 3);
    expect(voiced / 3000).toBeGreaterThan(0.18);
    expect(voiced / 3000).toBeLessThan(0.33);
  });

  it('a pose with no line does not count as voiced', () => {
    const { voice, history } = pickVoice('idle', createVoiceHistory(), always);
    expect(voice).toBeNull();
    expect(history.lastVoiced).toBe(false);
  });
});
