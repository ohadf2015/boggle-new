/**
 * Tests for useWordPackBuilder hook
 * TDD: RED phase — all tests written before implementation
 */

import { renderHook, act } from '@testing-library/react';
import { useWordPackBuilder } from '../useWordPackBuilder';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useWordPackBuilder — initial state', () => {
  it('starts with empty name', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    expect(result.current.name).toBe('');
  });

  it('starts with empty words array', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    expect(result.current.words).toEqual([]);
  });

  it('starts with empty description', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    expect(result.current.description).toBe('');
  });

  it('starts with default language en', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    expect(result.current.language).toBe('en');
  });

  it('canPublish is false initially', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    expect(result.current.canPublish).toBe(false);
  });

  it('isPublishing is false initially', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    expect(result.current.isPublishing).toBe(false);
  });

  it('publishedPackId is null initially', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    expect(result.current.publishedPackId).toBeNull();
  });

  it('publishError is null initially', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    expect(result.current.publishError).toBeNull();
  });
});

describe('useWordPackBuilder — setters', () => {
  it('setName updates name', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    act(() => { result.current.setName('My Pack'); });
    expect(result.current.name).toBe('My Pack');
  });

  it('setDescription updates description', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    act(() => { result.current.setDescription('A cool pack'); });
    expect(result.current.description).toBe('A cool pack');
  });

  it('setLanguage updates language', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    act(() => { result.current.setLanguage('es'); });
    expect(result.current.language).toBe('es');
  });

  it('setThemeEmoji updates themeEmoji', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    act(() => { result.current.setThemeEmoji('🐶'); });
    expect(result.current.themeEmoji).toBe('🐶');
  });

  it('setTags updates tags array', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    act(() => { result.current.setTags(['Animals', 'Food']); });
    expect(result.current.tags).toEqual(['Animals', 'Food']);
  });
});

describe('useWordPackBuilder — addWord', () => {
  it('adds a valid word to the words array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    });

    const { result } = renderHook(() => useWordPackBuilder());

    let validation: { word: string; valid: boolean; duplicate: boolean } | undefined;
    await act(async () => {
      validation = await result.current.addWord('APPLE');
    });

    expect(result.current.words).toContain('APPLE');
    expect(validation?.valid).toBe(true);
    expect(validation?.duplicate).toBe(false);
  });

  it('does not add an invalid word', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false }),
    });

    const { result } = renderHook(() => useWordPackBuilder());

    let validation: { word: string; valid: boolean; duplicate: boolean } | undefined;
    await act(async () => {
      validation = await result.current.addWord('ZZZZQ');
    });

    expect(result.current.words).not.toContain('ZZZZQ');
    expect(validation?.valid).toBe(false);
  });

  it('rejects duplicate words', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    });

    const { result } = renderHook(() => useWordPackBuilder());

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
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    });

    const { result } = renderHook(() => useWordPackBuilder());

    await act(async () => {
      await result.current.addWord('apple');
    });

    expect(result.current.words).toContain('APPLE');
  });
});

describe('useWordPackBuilder — removeWord', () => {
  it('removes a word from the words array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    });

    const { result } = renderHook(() => useWordPackBuilder());

    await act(async () => {
      await result.current.addWord('APPLE');
    });

    act(() => { result.current.removeWord('APPLE'); });

    expect(result.current.words).not.toContain('APPLE');
  });

  it('handles removing a non-existent word gracefully', () => {
    const { result } = renderHook(() => useWordPackBuilder());
    expect(() => {
      act(() => { result.current.removeWord('NOTHERE'); });
    }).not.toThrow();
  });
});

describe('useWordPackBuilder — bulkAddWords', () => {
  it('splits text by newlines and adds valid words', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: false }) });

    const { result } = renderHook(() => useWordPackBuilder());

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
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) });

    const { result } = renderHook(() => useWordPackBuilder());

    await act(async () => {
      await result.current.bulkAddWords('CAT\n\n\nDOG');
    });

    // Only 2 non-empty words → 2 fetch calls max
    // DOG also gets validated
    expect(result.current.words.length).toBeGreaterThanOrEqual(1);
  });
});

describe('useWordPackBuilder — canPublish', () => {
  it('is false when name is empty even with 10+ words', async () => {
    for (let i = 0; i < 10; i++) {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) });
    }

    const { result } = renderHook(() => useWordPackBuilder());

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await result.current.addWord(`WORD${i}`);
      });
    }

    expect(result.current.canPublish).toBe(false);
  });

  it('is false when name is set but fewer than 10 words', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) });

    const { result } = renderHook(() => useWordPackBuilder());

    act(() => { result.current.setName('My Pack'); });

    await act(async () => {
      await result.current.addWord('APPLE');
    });

    expect(result.current.canPublish).toBe(false);
  });

  it('is true when name is set and 10+ words added', async () => {
    for (let i = 0; i < 10; i++) {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) });
    }

    const { result } = renderHook(() => useWordPackBuilder());

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
    for (let i = 0; i < 10; i++) {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) });
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pack-123' }),
    });

    const { result } = renderHook(() => useWordPackBuilder());

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
    for (let i = 0; i < 10; i++) {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) });
    }
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Server error' }),
    });

    const { result } = renderHook(() => useWordPackBuilder());

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
