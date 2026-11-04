import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

let query = '';
let lang = 'en';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(query),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => `/${lang}/student/achievements/preview`,
  useParams: () => ({ locale: lang }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: lang, dir: lang === 'he' ? 'rtl' : 'ltr' }),
}));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => true }));

import AwardsPreviewClient from '../preview/PreviewClient';

describe('awards preview route', () => {
  beforeEach(() => { query = ''; lang = 'en'; });

  it.each(['en', 'he'])('given ?view=awards in %s, when rendered, then badges show without throwing', (l) => {
    lang = l;
    query = 'view=awards';
    render(<AwardsPreviewClient />);
    expect(screen.queryByTestId('awards-empty')).not.toBeInTheDocument();
    expect(screen.getAllByText('education.achievements.first_lesson.name').length).toBeGreaterThan(0);
  });

  it('given ?view=empty, when rendered, then the empty state shows', () => {
    query = 'view=empty';
    render(<AwardsPreviewClient />);
    expect(screen.getByTestId('awards-empty')).toBeInTheDocument();
  });

  it.each([['the bare URL', ''], ['a non-winner', 'me=Maya'], ['?view=results', 'view=results']])('given %s, when rendered, then the lesson-complete score step opens', (_label, q) => {
    query = q;
    render(<AwardsPreviewClient />);
    expect(screen.getByTestId('results-step-score')).toBeInTheDocument();
  });
});
