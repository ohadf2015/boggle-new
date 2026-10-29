/**
 * exp-mp-duo-bot-v1, client half: the host's start asks for a third-seat bot
 * only in the `bot` arm and never from a classroom; exposure is counted only
 * when the room really is a 1v1 (2 humans, no bot).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockExperiment } = vi.hoisted(() => ({
  mockExperiment: { variant: 'control' as string, trackExposure: vi.fn() },
}));
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => mockExperiment }));

import { isDuoRoster, useDuoBotRequest } from '../duoBotRequest';

describe('isDuoRoster', () => {
  it('is true for exactly two humans and no bot', () => {
    expect(isDuoRoster([{ username: 'a', isHost: true }, { username: 'b' }])).toBe(true);
  });
  it('is false for a solo host, three humans, or a seated bot', () => {
    expect(isDuoRoster([{ username: 'a' }])).toBe(false);
    expect(isDuoRoster([{ username: 'a' }, { username: 'b' }, { username: 'c' }])).toBe(false);
    expect(isDuoRoster([{ username: 'a' }, { username: 'b' }, { username: 'bot', isBot: true }])).toBe(false);
  });
  it('accepts bare usernames (legacy roster shape) as humans', () => {
    expect(isDuoRoster(['a', 'b'])).toBe(true);
  });
});

describe('useDuoBotRequest', () => {
  beforeEach(() => {
    mockExperiment.variant = 'control';
    mockExperiment.trackExposure.mockClear();
  });

  it('control arm never asks for a bot', () => {
    const { result } = renderHook(() => useDuoBotRequest({ isClassroom: false, isDuo: true }));
    expect(result.current).toBe(false);
  });

  it('bot arm asks for a bot in a public room', () => {
    mockExperiment.variant = 'bot';
    const { result } = renderHook(() => useDuoBotRequest({ isClassroom: false, isDuo: true }));
    expect(result.current).toBe(true);
  });

  it('bot arm never asks from a classroom room', () => {
    mockExperiment.variant = 'bot';
    const { result } = renderHook(() => useDuoBotRequest({ isClassroom: true, isDuo: true }));
    expect(result.current).toBe(false);
    expect(mockExperiment.trackExposure).not.toHaveBeenCalled();
  });

  it('counts exposure once the room is a 1v1, not before', () => {
    mockExperiment.variant = 'bot';
    const { rerender } = renderHook((p: { isDuo: boolean }) => useDuoBotRequest({ isClassroom: false, isDuo: p.isDuo }), { initialProps: { isDuo: false } });
    expect(mockExperiment.trackExposure).not.toHaveBeenCalled();
    rerender({ isDuo: true });
    expect(mockExperiment.trackExposure).toHaveBeenCalled();
  });
});
