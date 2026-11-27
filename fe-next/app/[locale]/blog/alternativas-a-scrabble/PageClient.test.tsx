import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'es' }),
  usePathname: () => '/es/blog/alternativas-a-scrabble',
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'es', t: (k: string) => k, dir: 'ltr' }) }));
vi.mock('@/components/blog/RelatedArticles', () => ({ RelatedArticles: () => null }));
vi.mock('@/components/blog/AuthorBioCard', () => ({ AuthorBioCard: () => null }));

import PageClient from './PageClient';

describe('alternativas-a-scrabble', () => {
  it('links the Apalabrados comparison and names Apalabrados in the body', () => {
    render(<PageClient />);
    expect(screen.getByRole('link', { name: 'LexiClash vs Apalabrados' })).toHaveAttribute(
      'href',
      '/es/lexiclash-vs-apalabrados',
    );
    expect(screen.getByText(/la alternativa que casi todo el mundo conoce es Apalabrados/)).toBeInTheDocument();
    expect(screen.queryByText(/Wheel Rush/)).not.toBeInTheDocument();
  });
});
