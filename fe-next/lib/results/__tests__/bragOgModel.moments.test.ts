import { describe, it, expect } from 'vitest';
import { deriveBragOgModel } from '../bragOgModel';

const model = (q: Record<string, string>) => deriveBragOgModel(new URLSearchParams(q));

describe('deriveBragOgModel personal moments', () => {
  it('Given no kind, Then it stays a result card with the outcome headline', () => {
    const m = model({ score: '142', rival: '118' });
    expect(m.kind).toBe('result');
    expect(m.headline).toBe('VICTORY');
  });

  it('Given an unknown kind, Then it falls back to a result card', () => {
    expect(model({ score: '5', kind: 'hacked' }).kind).toBe('result');
  });

  it.each([
    ['record', 'NEW RECORD'],
    ['worldRecord', 'WORLD RECORD'],
    ['achievement', 'ACHIEVEMENT UNLOCKED'],
  ])('Given kind=%s, Then the headline is %s', (kind, headline) => {
    expect(model({ score: '900', kind }).headline).toBe(headline);
  });

  it('Given kind=level, Then the headline carries the level from score', () => {
    const m = model({ score: '12', kind: 'level' });
    expect(m.kind).toBe('level');
    expect(m.headline).toBe('LEVEL 12');
  });

  it('labels every results-screen mode instead of defaulting to ARENA', () => {
    expect(model({ mode: 'tower' }).modeLabel).toBe('WORD TOWER');
    expect(model({ mode: 'quickPlay' }).modeLabel).toBe('QUICK PLAY');
    expect(model({ mode: 'single' }).modeLabel).toBe('SOLO');
    expect(model({ mode: 'multiplayer' }).modeLabel).toBe('ARENA');
  });

  it('clamps title to 40 and me to 24 characters', () => {
    const m = model({ kind: 'achievement', title: 'T'.repeat(90), me: 'M'.repeat(90) });
    expect(m.title).toHaveLength(40);
    expect(m.me).toHaveLength(24);
  });

  it('strips emoji, control chars and newlines from title and me', () => {
    const m = model({ kind: 'achievement', title: 'Word\nSmith 🔥', me: '\u0000Dana‍' });
    expect(m.title).toBe('Word Smith');
    expect(m.me).toBe('Dana');
  });

  it('drops empty title and me', () => {
    const m = model({ kind: 'achievement', title: '   ', me: '🔥' });
    expect(m.title).toBeNull();
    expect(m.me).toBeNull();
  });

  it('keeps Latin text (with accents) on the image', () => {
    const m = model({ kind: 'achievement', title: 'Señor Palabras', me: 'Zoë' });
    expect(m.imageTitle).toBe('Señor Palabras');
    expect(m.imageMe).toBe('Zoë');
  });

  it('keeps Cyrillic on the image, which the default font covers', () => {
    expect(model({ kind: 'level', me: 'Дана' }).imageMe).toBe('Дана');
  });

  it('keeps Hebrew and Japanese for metadata but drops them from the image, which has no font for them', () => {
    const m = model({ kind: 'achievement', title: 'אלוף המילים', me: 'たろう' });
    expect(m.title).toBe('אלוף המילים');
    expect(m.me).toBe('たろう');
    expect(m.imageTitle).toBeNull();
    expect(m.imageMe).toBeNull();
  });
});
