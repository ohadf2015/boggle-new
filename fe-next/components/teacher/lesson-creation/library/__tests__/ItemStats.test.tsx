import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { en } from '@/translations/en';
import type { LibraryItem } from '@/lib/education/libraryTypes';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params: Record<string, string | number> = {}) => {
      const value = key
        .split('.')
        .reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), en);
      if (typeof value !== 'string') throw new Error(`missing ${key}`);
      return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
    },
  }),
}));

import { ItemStats } from '../LibraryCard';

const item = (playCount: number | null, copyCount: number | null): LibraryItem => ({
  id: 'pub-1',
  source: 'teacher',
  name: 'Fruits',
  description: null,
  language: 'en',
  words: [{ word: 'apple' }],
  wordCount: 1,
  authorName: null,
  gradeBand: null,
  topic: null,
  copyCount,
  playCount,
  createdAt: null,
  isMine: false,
  remixedFrom: null,
});

describe('ItemStats social proof', () => {
  it('given plays but no copies, then only plays show and no zero is rendered', () => {
    const { container } = render(<ItemStats item={item(3, 0)} />);
    expect(screen.getByLabelText('3 plays')).toBeTruthy();
    expect(screen.queryByLabelText(/copies?$/)).toBeNull();
    expect(container.textContent).not.toMatch(/\b0\b/);
  });

  it('given copies but no plays, then only copies show', () => {
    const { container } = render(<ItemStats item={item(0, 1)} />);
    expect(screen.getByLabelText('1 copy')).toBeTruthy();
    expect(screen.queryByLabelText(/plays?$/)).toBeNull();
    expect(container.textContent).not.toMatch(/\b0\b/);
  });

  it('given the verbose variant, then the plural label is visible text', () => {
    const { container } = render(<ItemStats item={item(1, 12)} verbose />);
    expect(container.textContent).toContain('1 play');
    expect(container.textContent).toContain('12 copies');
  });

  it('given counts unavailable, then nothing renders', () => {
    const { container } = render(<ItemStats item={item(null, null)} />);
    expect(container.textContent).toBe('');
  });
});
