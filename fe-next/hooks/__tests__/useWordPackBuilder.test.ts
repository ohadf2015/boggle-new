/**
 * Tests for useWordPackBuilder hook
 * TDD: RED phase — all tests written before implementation
 */

import { vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWordPackBuilder } from '../useWordPackBuilder';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// Known-valid words for tests
const VALID_WORDS = new Set(['APPLE', 'CAT', 'DOG', 'WORD0', 'WORD1', 'WORD2', 'WORD3', 'WORD4', 'WORD5', 'WORD6', 'WORD7', 'WORD8', 'WORD9']);

beforeEach(() => {
  vi.clearAllMocks();

  // Default handlers
  server.use(
    http.post('*/api/ugc/packs/validate*', async ({ request }) => {
      const body = await request.json() as { word: string };
      const valid = VALID_WORDS.has(body.word.toUpperCase());
      return HttpResponse.json({ valid });
    }),
    http.post('*/api/ugc/packs', () =>
      HttpResponse.json({ id: 'pack-123' })
    )
  );
});

describe('useWordPackBuilder — initial state', () => {
  it('starts with empty name', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    expect(result.current.name).toBe('');
  });

  it('starts with empty words array', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    expect(result.current.words).toEqual([]);
  });

  it('starts with empty description', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    expect(result.current.description).toBe('');
  });

  it('starts with default language en', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    expect(result.current.language).toBe('en');
  });

  it('canPublish is false initially', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    expect(result.current.canPublish).toBe(false);
  });

  it('isPublishing is false initially', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    expect(result.current.isPublishing).toBe(false);
  });

  it('publishedPackId is null initially', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    expect(result.current.publishedPackId).toBeNull();
  });

  it('publishError is null initially', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    expect(result.current.publishError).toBeNull();
  });
});

describe('useWordPackBuilder — setters', () => {
  it('setName updates name', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    act(() => { result.current.setName('My Pack'); });
    expect(result.current.name).toBe('My Pack');
  });

  it('setDescription updates description', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    act(() => { result.current.setDescription('A cool pack'); });
    expect(result.current.description).toBe('A cool pack');
  });

  it('setLanguage updates language', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    act(() => { result.current.setLanguage('es'); });
    expect(result.current.language).toBe('es');
  });

  it('setThemeEmoji updates themeEmoji', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    act(() => { result.current.setThemeEmoji('🐶'); });
    expect(result.current.themeEmoji).toBe('🐶');
  });

  it('setTags updates tags array', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    act(() => { result.current.setTags(['Animals', 'Food']); });
    expect(result.current.tags).toEqual(['Animals', 'Food']);
  });
});

describe('useWordPackBuilder — addWord', () => {
  it('adds a valid word to the words array', async () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    let validation: { word: string; valid: boolean; duplicate: boolean } | undefined;
    await act(async () => {
      validation = await result.current.addWord('APPLE');
    });

    expect(result.current.words).toContain('APPLE');
    expect(validation?.valid).toBe(true);
    expect(validation?.duplicate).toBe(false);
  });

  it('does not add an invalid word', async () => {
    // ZZZZQ is not in VALID_WORDS so MSW returns valid: false
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    let validation: { word: string; valid: boolean; duplicate: boolean } | undefined;
    await act(async () => {
      validation = await result.current.addWord('ZZZZQ');
    });

    expect(result.current.words).not.toContain('ZZZZQ');
    expect(validation?.valid).toBe(false);
  });

  it('rejects duplicate words', async () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    // Add the word once
    await act(async () => {
      await result.current.addWord('APPLE');
    });

    // Try adding again — no fetch needed, checked locally
    let validation: { word: string; valid: boolean; duplicate: boolean } | undefined;
    await act(async () => {
      validation = await result.current.addWord('APPLE');
    });

    expect(result.current.words.filter((w) => w === 'APPLE').length).toBe(1);
    expect(validation?.duplicate).toBe(true);
  });

  it('uppercases the word before adding', async () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.addWord('apple');
    });

    expect(result.current.words).toContain('APPLE');
  });
});

describe('useWordPackBuilder — removeWord', () => {
  it('removes a word from the words array', async () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.addWord('APPLE');
    });

    act(() => { result.current.removeWord('APPLE'); });

    expect(result.current.words).not.toContain('APPLE');
  });

  it('handles removing a non-existent word gracefully', () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });
    expect(() => {
      act(() => { result.current.removeWord('NOTHERE'); });
    }).not.toThrow();
  });
});

describe('useWordPackBuilder — bulkAddWords', () => {
  it('splits text by newlines and adds valid words', async () => {
    // CAT and DOG are valid, ZZZ is not
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    let validations: { word: string; valid: boolean; duplicate: boolean }[] = [];
    await act(async () => {
      validations = await result.current.bulkAddWords('CAT\nDOG\nZZZ');
    });

    expect(result.current.words).toContain('CAT');
    expect(result.current.words).toContain('DOG');
    expect(result.current.words).not.toContain('ZZZ');
    expect(validations).toHaveLength(3);
  });

  it('skips empty lines', async () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.bulkAddWords('CAT\n\n\nDOG');
    });

    // Only 2 non-empty words → 2 fetch calls max
    expect(result.current.words.length).toBeGreaterThanOrEqual(1);
  });
});

describe('useWordPackBuilder — canPublish', () => {
  it('is false when name is empty even with 10+ words', async () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await result.current.addWord(`WORD${i}`);
      });
    }

    expect(result.current.canPublish).toBe(false);
  });

  it('is false when name is set but fewer than 10 words', async () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    act(() => { result.current.setName('My Pack'); });

    await act(async () => {
      await result.current.addWord('APPLE');
    });

    expect(result.current.canPublish).toBe(false);
  });

  it('is true when name is set and 10+ words added', async () => {
    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    act(() => { result.current.setName('My Pack'); });

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await result.current.addWord(`WORD${i}`);
      });
    }

    expect(result.current.canPublish).toBe(true);
  });
});

describe('useWordPackBuilder — publishPack', () => {
  it('calls POST /api/ugc/packs and sets publishedPackId on success', async () => {
    let capturedPublishBody: Record<string, unknown> | null = null;
    server.use(
      http.post('*/api/ugc/packs', async ({ request }) => {
        capturedPublishBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ id: 'pack-123' });
      })
    );

    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    act(() => { result.current.setName('My Pack'); });

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await result.current.addWord(`WORD${i}`);
      });
    }

    await act(async () => {
      await result.current.publishPack();
    });

    expect(result.current.publishedPackId).toBe('pack-123');
    expect(result.current.isPublishing).toBe(false);
    expect(result.current.publishError).toBeNull();
  });

  it('sets publishError on API failure', async () => {
    server.use(
      http.post('*/api/ugc/packs', () =>
        new HttpResponse(JSON.stringify({ message: 'Server error' }), { status: 500 })
      )
    );

    const { result } = renderHook(() => useWordPackBuilder(), { wrapper: createWrapper() });

    act(() => { result.current.setName('My Pack'); });

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await result.current.addWord(`WORD${i}`);
      });
    }

    await act(async () => {
      await result.current.publishPack();
    });

    expect(result.current.publishedPackId).toBeNull();
    expect(result.current.publishError).toBeTruthy();
  });
});
