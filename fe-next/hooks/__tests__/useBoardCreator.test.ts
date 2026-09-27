/**
 * Tests for useBoardCreator hook
 * TDD: RED phase — all tests written before implementation
 */

import { vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBoardCreator } from '../useBoardCreator';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

let queryClient: QueryClient;
let wrapper: ({ children }: { children: React.ReactNode }) => React.ReactElement;

vi.useFakeTimers();

const mockBoard = {
  grid: [['A','B','C','D'],['E','F','G','H'],['I','J','K','L'],['M','N','O','P']],
  totalFindableWords: 20,
  difficulty: 'MEDIUM' as const,
  seedWordsPlaced: ['cat'],
};

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  // Default: generate succeeds
  server.use(
    http.post('*/api/ugc/boards/generate*', () => HttpResponse.json(mockBoard)),
    http.post('*/api/ugc/boards/publish*', () =>
      HttpResponse.json({ boardCode: 'abc12345', title: 'Test' })
    )
  );
});

describe('useBoardCreator — initial state', () => {
  it('starts at configure step', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.step).toBe('configure');
  });

  it('starts with gridSize 6', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.gridSize).toBe(6);
  });

  it('starts with language en', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.language).toBe('en');
  });

  it('starts with empty seedWords', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.seedWords).toBe('');
  });

  it('generatedBoard is null initially', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.generatedBoard).toBeNull();
  });

  it('isGenerating is false initially', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.isGenerating).toBe(false);
  });

  it('generateError is null initially', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.generateError).toBeNull();
  });

  it('title is empty initially', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.title).toBe('');
  });

  it('description is empty initially', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.description).toBe('');
  });

  it('isPublishing is false initially', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.isPublishing).toBe(false);
  });

  it('publishError is null initially', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.publishError).toBeNull();
  });

  it('publishedBoard is null initially', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    expect(result.current.publishedBoard).toBeNull();
  });
});

describe('useBoardCreator — setters', () => {
  it('setStep updates step', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.setStep('preview'); });
    expect(result.current.step).toBe('preview');
  });

  it('setGridSize updates gridSize', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.setGridSize(6); });
    expect(result.current.gridSize).toBe(6);
  });

  it('setLanguage updates language', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.setLanguage('he'); });
    expect(result.current.language).toBe('he');
  });

  it('setSeedWords updates seedWords', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.setSeedWords('cat, dog'); });
    expect(result.current.seedWords).toBe('cat, dog');
  });

  it('setTitle updates title', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.setTitle('My Puzzle'); });
    expect(result.current.title).toBe('My Puzzle');
  });

  it('setDescription updates description', () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.setDescription('A fun puzzle'); });
    expect(result.current.description).toBe('A fun puzzle');
  });
});

describe('useBoardCreator — generateBoard', () => {
  it('calls POST /api/ugc/boards/generate with correct params', async () => {
    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.post('*/api/ugc/boards/generate*', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json(mockBoard);
      })
    );

    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.addTag('cat'); });

    await act(async () => { await result.current.generateBoard(); });

    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.gridSize).toBe(6);
  });

  it('sets generatedBoard on success', async () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.addTag('cat'); });

    await act(async () => { await result.current.generateBoard(); });

    expect(result.current.generatedBoard).toEqual(mockBoard);
  });

  it('advances step to preview on success', async () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.addTag('cat'); });

    await act(async () => { await result.current.generateBoard(); });

    expect(result.current.step).toBe('preview');
  });

  it('sets generateError on API failure', async () => {
    server.use(
      http.post('*/api/ugc/boards/generate*', () =>
        new HttpResponse(JSON.stringify({ error: 'Generation failed' }), { status: 400 })
      )
    );

    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.addTag('cat'); });

    await act(async () => { await result.current.generateBoard(); });

    expect(result.current.generateError).not.toBeNull();
    expect(result.current.generatedBoard).toBeNull();
  });

  it('sets generateError on network error', async () => {
    server.use(
      http.post('*/api/ugc/boards/generate*', () => HttpResponse.error())
    );

    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.addTag('cat'); });

    await act(async () => { await result.current.generateBoard(); });

    expect(result.current.generateError).not.toBeNull();
  });

  it('clears generateError on successful generate', async () => {
    server.use(
      http.post('*/api/ugc/boards/generate*', () =>
        new HttpResponse(JSON.stringify({ error: 'fail' }), { status: 400 })
      )
    );

    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.addTag('cat'); });

    await act(async () => { await result.current.generateBoard(); });
    expect(result.current.generateError).not.toBeNull();

    // Now succeed
    server.use(
      http.post('*/api/ugc/boards/generate*', () => HttpResponse.json(mockBoard))
    );
    await act(async () => { await result.current.generateBoard(); });
    expect(result.current.generateError).toBeNull();
  });
});

describe('useBoardCreator — shuffleBoard', () => {
  const shuffleBoard = {
    grid: [['A','B','C','D'],['E','F','G','H'],['I','J','K','L'],['M','N','O','P']],
    totalFindableWords: 18,
    difficulty: 'EASY' as const,
    seedWordsPlaced: [],
  };

  it('calls generate endpoint again (same params)', async () => {
    let callCount = 0;
    server.use(
      http.post('*/api/ugc/boards/generate*', () => {
        callCount++;
        return HttpResponse.json(shuffleBoard);
      })
    );

    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.addTag('cat'); });

    const callsBefore = callCount;
    await act(async () => { await result.current.shuffleBoard(); });

    expect(callCount).toBeGreaterThan(callsBefore);
  });

  it('does not advance step when already at preview', async () => {
    server.use(
      http.post('*/api/ugc/boards/generate*', () => HttpResponse.json(shuffleBoard))
    );

    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    act(() => { result.current.setStep('preview'); });
    act(() => { result.current.addTag('cat'); });
    await act(async () => { await result.current.shuffleBoard(); });

    expect(result.current.step).toBe('preview');
  });
});

describe('useBoardCreator — publishBoard', () => {
  const smallBoard = {
    grid: [['A','B'],['C','D']],
    totalFindableWords: 5,
    difficulty: 'EASY' as const,
    seedWordsPlaced: [],
  };

  /** Helper: add a tag and call generateBoard to populate generatedBoard */
  async function setupWithBoard(result: { current: ReturnType<typeof useBoardCreator> }) {
    server.use(
      http.post('*/api/ugc/boards/generate*', () => HttpResponse.json(smallBoard))
    );
    act(() => { result.current.addTag('cat'); });
    await act(async () => { await result.current.generateBoard(); });
  }

  it('calls POST /api/ugc/boards/publish with title and grid', async () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    await setupWithBoard(result);

    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.post('*/api/ugc/boards/publish*', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ boardCode: 'abc12345', title: 'Test' });
      })
    );

    act(() => { result.current.setTitle('Test'); });
    await act(async () => { await result.current.publishBoard(); });

    expect(capturedBody).not.toBeNull();
    expect(JSON.stringify(capturedBody)).toContain('"title":"Test"');
  });

  it('sets publishedBoard on success', async () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    await setupWithBoard(result);

    server.use(
      http.post('*/api/ugc/boards/publish*', () =>
        HttpResponse.json({ boardCode: 'xyz99999', title: 'My Board' })
      )
    );

    act(() => { result.current.setTitle('My Board'); });
    await act(async () => { await result.current.publishBoard(); });

    expect(result.current.publishedBoard).toEqual({ boardCode: 'xyz99999', title: 'My Board' });
  });

  it('advances step to published on success', async () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    await setupWithBoard(result);

    act(() => { result.current.setTitle('Test'); });
    await act(async () => { await result.current.publishBoard(); });

    expect(result.current.step).toBe('published');
  });

  it('sets publishError on API failure', async () => {
    const { result } = renderHook(() => useBoardCreator(), { wrapper });
    await setupWithBoard(result);

    server.use(
      http.post('*/api/ugc/boards/publish*', () =>
        new HttpResponse(JSON.stringify({ error: 'Publish failed' }), { status: 400 })
      )
    );

    await act(async () => { await result.current.publishBoard(); });

    expect(result.current.publishError).not.toBeNull();
    expect(result.current.publishedBoard).toBeNull();
  });
});
