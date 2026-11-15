import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

const meta = (sp: Record<string, string>) =>
  generateMetadata({ params: Promise.resolve({ locale: 'en', code: 'me' }), searchParams: Promise.resolve(sp) });

const ogQuery = async (sp: Record<string, string>) => {
  const images = (await meta(sp)).openGraph?.images;
  const first = Array.isArray(images) ? images[0] : images;
  return new URL(String(typeof first === 'object' && first && 'url' in first ? first.url : first)).searchParams;
};

describe('brag page metadata for personal moments', () => {
  it('forwards kind, title and me to the image', async () => {
    const q = await ogQuery({ score: '0', kind: 'achievement', title: 'Word Smith', me: 'Dana' });
    expect(q.get('kind')).toBe('achievement');
    expect(q.get('title')).toBe('Word Smith');
    expect(q.get('me')).toBe('Dana');
  });

  it.each([
    [{ kind: 'record', score: '900', mode: 'tower' }, 'New record: 900 | LexiClash'],
    [{ kind: 'worldRecord', score: '1200' }, 'World record: 1200 | LexiClash'],
    [{ kind: 'achievement', title: 'Word Smith' }, 'Achievement unlocked: Word Smith | LexiClash'],
    [{ kind: 'level', score: '12' }, 'Level 12 | LexiClash'],
  ])('titles %o as %s', async (sp, title) => {
    expect((await meta(sp)).title).toEqual({ absolute: title });
  });

  it('names the sharer in the description', async () => {
    const m = await meta({ kind: 'level', score: '12', me: 'Dana' });
    expect(m.description).toContain('Dana');
  });

  it('sanitises title and me before they reach metadata', async () => {
    const m = await meta({ kind: 'achievement', title: 'Smith\n🔥'.padEnd(80, 'x'), me: '🔥' });
    const blob = JSON.stringify(m);
    expect(blob).not.toMatch(/[\u{1F000}-\u{1FAFF}]/u);
    expect(blob).not.toContain('\\n');
    expect(m.description).not.toContain('undefined');
  });

  it('keeps the existing result title when no kind is given', async () => {
    expect((await meta({ score: '142', rival: '118' })).title).toEqual({ absolute: '142 - 118 | LexiClash' });
  });
});
