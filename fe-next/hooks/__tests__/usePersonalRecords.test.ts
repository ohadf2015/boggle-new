import { renderHook } from '@testing-library/react';
import { usePersonalRecords } from '../usePersonalRecords';

describe('usePersonalRecords', () => {
  it('returns personal records with expected shape', () => {
    const { result } = renderHook(() => usePersonalRecords());

    expect(result.current.longestWord).toBeDefined();
    expect(result.current.highestCombo).toBeDefined();
    expect(result.current.bestScorePerMode).toBeDefined();
    expect(result.current.fastestWord).toBeDefined();
    expect(result.current.totalUniqueWords).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns bestScorePerMode as an object with mode keys', () => {
    const { result } = renderHook(() => usePersonalRecords());
    const modes = result.current.bestScorePerMode;
    expect(typeof modes).toBe('object');
    expect(Object.keys(modes).length).toBeGreaterThan(0);
  });

  it('returns records array for rendering', () => {
    const { result } = renderHook(() => usePersonalRecords());
    const records = result.current.records;
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThan(0);
    expect(records[0]).toHaveProperty('label');
    expect(records[0]).toHaveProperty('value');
  });
});
