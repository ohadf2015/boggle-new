import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

const mk = (locale: string) => ({ params: Promise.resolve({ locale }) });

describe('lexiclash-vs-kahoot-gimkit-vocabulary metadata', () => {
  it('indexes the English version', async () => {
    const m = await generateMetadata(mk('en') as any);
    expect((m.robots as any).index).toBe(true);
    expect(m.alternates?.canonical).toBe('https://www.lexiclash.live/en/lexiclash-vs-kahoot-gimkit-vocabulary');
  });

  it('noindexes non-English locales (canonical stays EN)', async () => {
    const m = await generateMetadata(mk('he') as any);
    expect((m.robots as any).index).toBe(false);
    // canonical always points at the EN page so link equity consolidates there
    expect(m.alternates?.canonical).toBe('https://www.lexiclash.live/en/lexiclash-vs-kahoot-gimkit-vocabulary');
  });

  it('targets the classroom/competitor keyword cluster', async () => {
    const m = await generateMetadata(mk('en') as any);
    expect(String(m.keywords)).toMatch(/gimkit alternative/i);
    expect(String(m.keywords)).toMatch(/vocabulary\.com alternative/i);
  });
});
