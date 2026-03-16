import { renderHook } from '@testing-library/react';
import { useTvFinalMinute } from '../useTvFinalMinute';

describe('useTvFinalMinute', () => {
  it('returns isFinalMinute: false when remainingTime > 60', () => {
    const { result } = renderHook(() => useTvFinalMinute(90));
    expect(result.current.isFinalMinute).toBe(false);
  });

  it('returns isFinalMinute: true when remainingTime <= 60', () => {
    const { result } = renderHook(() => useTvFinalMinute(60));
    expect(result.current.isFinalMinute).toBe(true);
  });

  it('returns isFinalStretch: true when remainingTime <= 30', () => {
    const { result } = renderHook(() => useTvFinalMinute(30));
    expect(result.current.isFinalStretch).toBe(true);
  });

  it('returns isFinalStretch: false when remainingTime > 30', () => {
    const { result } = renderHook(() => useTvFinalMinute(31));
    expect(result.current.isFinalStretch).toBe(false);
  });

  it('returns isCritical: true when remainingTime <= 10', () => {
    const { result } = renderHook(() => useTvFinalMinute(10));
    expect(result.current.isCritical).toBe(true);
  });

  it('returns isCritical: false when remainingTime > 10', () => {
    const { result } = renderHook(() => useTvFinalMinute(11));
    expect(result.current.isCritical).toBe(false);
  });

  it('returns urgencyLevel normal when remainingTime > 60', () => {
    const { result } = renderHook(() => useTvFinalMinute(120));
    expect(result.current.urgencyLevel).toBe('normal');
  });

  it('returns urgencyLevel urgent when remainingTime <= 60 and > 30', () => {
    const { result } = renderHook(() => useTvFinalMinute(45));
    expect(result.current.urgencyLevel).toBe('urgent');
  });

  it('returns urgencyLevel critical when remainingTime <= 30 and > 10', () => {
    const { result } = renderHook(() => useTvFinalMinute(20));
    expect(result.current.urgencyLevel).toBe('critical');
  });

  it('returns urgencyLevel extreme when remainingTime <= 10', () => {
    const { result } = renderHook(() => useTvFinalMinute(5));
    expect(result.current.urgencyLevel).toBe('extreme');
  });

  it('returns heartbeatInterval 0 for normal', () => {
    const { result } = renderHook(() => useTvFinalMinute(120));
    expect(result.current.heartbeatInterval).toBe(0);
  });

  it('returns heartbeatInterval 1000 for urgent', () => {
    const { result } = renderHook(() => useTvFinalMinute(45));
    expect(result.current.heartbeatInterval).toBe(1000);
  });

  it('returns heartbeatInterval 500 for critical', () => {
    const { result } = renderHook(() => useTvFinalMinute(20));
    expect(result.current.heartbeatInterval).toBe(500);
  });

  it('returns heartbeatInterval 200 for extreme', () => {
    const { result } = renderHook(() => useTvFinalMinute(5));
    expect(result.current.heartbeatInterval).toBe(200);
  });

  it('returns correct bgTintClass for each urgency level', () => {
    const normal = renderHook(() => useTvFinalMinute(120));
    expect(normal.result.current.bgTintClass).toBe('');

    const urgent = renderHook(() => useTvFinalMinute(45));
    expect(urgent.result.current.bgTintClass).toBe('bg-red-900/10');

    const critical = renderHook(() => useTvFinalMinute(20));
    expect(critical.result.current.bgTintClass).toBe('bg-red-900/20');

    const extreme = renderHook(() => useTvFinalMinute(5));
    expect(extreme.result.current.bgTintClass).toBe('bg-red-900/30');
  });

  it('returns normal when remainingTime is null', () => {
    const { result } = renderHook(() => useTvFinalMinute(null));
    expect(result.current.urgencyLevel).toBe('normal');
    expect(result.current.isFinalMinute).toBe(false);
    expect(result.current.heartbeatInterval).toBe(0);
    expect(result.current.bgTintClass).toBe('');
  });
});
