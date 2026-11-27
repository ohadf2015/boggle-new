import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'sv' }) }));
vi.mock('@/components/ads', () => ({ InlineBannerAd: () => null }));
vi.mock('@/components/AutoHideHeader', () => ({ AutoHideHeader: () => null }));

const api = vi.hoisted(() => ({ resolve: null as null | ((v: unknown) => void), reject: null as null | ((e: unknown) => void) }));
vi.mock('../wordList', async (orig) => {
  const actual = await orig<typeof import('../wordList')>();
  return {
    ...actual,
    findWordsApi: vi.fn(
      () => new Promise((resolve, reject) => { api.resolve = resolve; api.reject = reject; }),
    ),
  };
});

import WordSolverPageClient from '../PageClient';

function search(letters: string) {
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: letters } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

const region = () => screen.queryByTestId('solver-results');

describe('word solver results region (layout shift)', () => {
  afterEach(() => { api.resolve = null; api.reject = null; });

  it('reserves the results space at tap time, before the answer arrives', () => {
    // Given the page before any search
    render(<WordSolverPageClient />);
    expect(region()).toBeNull();

    // When the visitor searches and the answer is still in flight
    search('stare');

    // Then the region already exists with its reserved height
    expect(region()).not.toBeNull();
    expect(region()!.className).toContain('h-[50dvh]');
  });

  it('keeps the reserved space when the search finds nothing', async () => {
    render(<WordSolverPageClient />);
    search('qx');
    await act(async () => { api.resolve!({ words: [], total: 0, capped: false }); });
    expect(region()!.className).toContain('h-[50dvh]');
  });

  it('shows errors inside the reserved region instead of above it', async () => {
    render(<WordSolverPageClient />);
    search('stare');
    await act(async () => { api.reject!(new Error('boom')); });
    expect(region()!.textContent).toContain('boom');
    expect(region()!.className).toContain('h-[50dvh]');
  });

  it('caps the region at a fixed height with internal scroll, so a large result list never shifts the page below it', async () => {
    render(<WordSolverPageClient />);
    search('aeiou');
    const manyWords = Array.from({ length: 500 }, (_, i) => `word${i}`);
    await act(async () => { api.resolve!({ words: manyWords, total: 500, capped: true }); });
    // Fixed height (not min-height): the box never grows past its reserved size,
    // no matter how many results land -- overflow scrolls inside it instead.
    expect(region()!.className).toContain('h-[50dvh]');
    expect(region()!.className).not.toContain('min-h-[50vh]');
    expect(region()!.className).toContain('overflow-y-auto');
  });
});
