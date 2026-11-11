import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWorldRecords, _resetWorldRecordsClient } from '../useWorldRecords';

const record = { recordKey: 'blast', holderId: 'u2', holderName: 'Ari', score: 1705 };

describe('useWorldRecords', () => {
  beforeEach(() => {
    _resetWorldRecordsClient();
    vi.restoreAllMocks();
  });

  it('loads the records once and shares them between components', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ records: [record] }), { status: 200 }));
    const a = renderHook(() => useWorldRecords());
    const b = renderHook(() => useWorldRecords());
    await waitFor(() => expect(a.result.current.status).toBe('ready'));
    await waitFor(() => expect(b.result.current.records).toEqual([record]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/records/world');
  });

  it('reports an error, not an empty list, and retry refetches', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ records: [record] }), { status: 200 }));
    const { result } = renderHook(() => useWorldRecords());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.records).toEqual([]);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.records).toEqual([record]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
