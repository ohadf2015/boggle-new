// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Page, { generateMetadata } from '../page';

vi.mock('next/image', () => ({
  default: ({ alt = '' }: { alt?: string }) => <span data-alt={alt} />,
}));

const params = Promise.resolve({ locale: 'he' });

async function renderPage() {
  return render(await Page({ params }));
}

describe('/he/hebrew-multiplayer-word-game', () => {
  it('links Hebrew readers to Hebrew pages, not the English-only anagram and Scrabble pages', async () => {
    const { container } = await renderPage();
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/he/tools/word-solver');
    expect(hrefs).toContain('/he/blog/hebrew-word-games-guide');
    expect(hrefs).not.toContain('/he/anagram');
    expect(hrefs).not.toContain('/he/lexiclash-vs-scrabble');
  });

  it('keeps the FAQ JSON-LD in step with the visible FAQ', async () => {
    const { container } = await renderPage();
    const ld = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((s) => JSON.parse(s.textContent || '{}'))
      .find((b) => b['@type'] === 'FAQPage');
    const questions = ld.mainEntity.map((q: { name: string }) => q.name);
    expect(questions).toContain('זה משחק מילים למבוגרים או לילדים?');
    expect(questions).toContain('במה לקסיקלאש שונה משבץ נא ומבוגל?');
    for (const q of questions) expect(container.textContent).toContain(q);
  });

  it('compares with Scrabble instead of claiming to be it', async () => {
    const meta = await generateMetadata({ params });
    expect(String(meta.title)).not.toMatch(/סקראבל|LexiClash|לקסיקלאש/);
    expect(String(meta.description)).toContain('חלופה מהירה לשבץ נא');
    const { container } = await renderPage();
    expect(container.querySelector('h1')?.textContent).not.toMatch(/סקראבל|בוגל/);
  });
});
