import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockPush, lang } = vi.hoisted(() => ({ mockPush: vi.fn(), lang: { current: 'en' } }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: lang.current, dir: lang.current === 'he' ? 'rtl' : 'ltr' }),
}));
vi.mock('@/components/practice/SpellingChallengePractice', () => ({
  SpellingChallengePractice: ({ words, onBack }: { words: Array<{ word: string }>; onBack: () => void }) => (
    <div data-testid="spelling-practice" data-count={words.length} data-first={words[0]?.word}>
      <button type="button" onClick={onBack}>back</button>
    </div>
  ),
}));

import Page, { generateMetadata } from '../page';

async function renderPage(locale: string) {
  lang.current = locale;
  render(await Page({ params: Promise.resolve({ locale }) }));
}

describe('/join/practice — the no-account practice round a dead end sends students to', () => {
  it.each(['en', 'he', 'es', 'sv', 'ja', 'ru'])('GIVEN locale %s THEN play starts at once with words in that language', async (locale) => {
    await renderPage(locale);
    const play = screen.getByTestId('spelling-practice');
    expect(Number(play.dataset.count)).toBeGreaterThanOrEqual(8);
    expect(screen.getByRole('heading', { name: 'education.student.deadEnd.practiceTitle' })).toBeInTheDocument();
  });

  it('GIVEN Hebrew THEN the round is laid out right to left', async () => {
    await renderPage('he');
    expect(screen.getByTestId('guest-practice-root')).toHaveAttribute('dir', 'rtl');
  });

  it('keeps a way back to the code screen, inside the classroom product, and no Pro or price anywhere', async () => {
    await renderPage('es');
    expect(screen.getByRole('link', { name: 'education.student.deadEnd.enterCode' })).toHaveAttribute('href', '/es/join');
    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect(mockPush).toHaveBeenCalledWith('/es/join');
    for (const a of screen.getAllByRole('link')) expect(a.getAttribute('href')).toMatch(/^\/es\/join/);
    expect(document.body.textContent).not.toMatch(/upgrade|\$|price/i);
  });

  it('is kept out of the search index', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    expect(meta.robots).toMatchObject({ index: false });
  });
});
