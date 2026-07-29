import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePracticeValidator } from './usePracticeValidator';

const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

const okValid = () =>
  Promise.resolve({ ok: true, status: 200, json: async () => ({ isValid: true, source: 'dictionary' }) });
const okInvalid = () =>
  Promise.resolve({ ok: true, status: 200, json: async () => ({ isValid: false, source: 'pending', reason: 'Word not in dictionary' }) });
const status429 = () =>
  Promise.resolve({ ok: false, status: 429, json: async () => ({}) });
const status500 = () =>
  Promise.resolve({ ok: false, status: 500, json: async () => ({}) });

describe('usePracticeValidator', () => {
  it('returns valid for a dictionary word', async () => {
    mockFetch.mockImplementationOnce(okValid);
    const { result } = renderHook(() => usePracticeValidator('en'));
    let res!: { isValid: boolean; source: string };
    await act(async () => { res = await result.current.check('STAR'); });
    expect(res.isValid).toBe(true);
    expect(res.source).toBe('dictionary');
  });

  it('caches a word for the session — second check does not refetch', async () => {
    mockFetch.mockImplementationOnce(okValid);
    const { result } = renderHook(() => usePracticeValidator('en'));
    await act(async () => { await result.current.check('STAR'); });
    await act(async () => { await result.current.check('STAR'); });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries once on 429 then succeeds', async () => {
    mockFetch.mockImplementationOnce(status429);
    mockFetch.mockImplementationOnce(okValid);
    const { result } = renderHook(() => usePracticeValidator('en'));
    let res!: { isValid: boolean };
    await act(async () => { res = await result.current.check('STAR'); });
    expect(res.isValid).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('optimistically accepts on 5xx (forgiving practice)', async () => {
    mockFetch.mockImplementationOnce(status500);
    const { result } = renderHook(() => usePracticeValidator('en'));
    let res!: { isValid: boolean; source: string };
    await act(async () => { res = await result.current.check('XYZQQ'); });
    expect(res.isValid).toBe(true);
    expect(res.source).toBe('optimistic');
  });

  it('returns invalid for a non-dictionary word (200 isValid:false)', async () => {
    mockFetch.mockImplementationOnce(okInvalid);
    const { result } = renderHook(() => usePracticeValidator('en'));
    let res!: { isValid: boolean };
    await act(async () => { res = await result.current.check('ZZZ'); });
    expect(res.isValid).toBe(false);
  });

  it('passes the language to the API', async () => {
    mockFetch.mockImplementationOnce(okValid);
    const { result } = renderHook(() => usePracticeValidator('he'));
    await act(async () => { await result.current.check('שלום'); });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.language).toBe('he');
    expect(body.word).toBe('שלום');
  });
});
