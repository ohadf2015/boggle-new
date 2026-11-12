import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useHostViewState } from '../useHostViewState';

function phoneViewport(isPhone: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: isPhone, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}

describe('useHostViewState — a classroom host always gets the host board', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('Given a classroom host on a phone with no saved lesson data, When the host view starts, Then it is the host board, not the player lobby', () => {
    phoneViewport(true);
    const { result } = renderHook(() => useHostViewState({ classroomHost: true }));
    expect(result.current.settings.hostPlaying).toBe(false);
  });

  it('Given a classroom host on a desktop whose old arcade session stored player mode, Then it is still the host board', () => {
    phoneViewport(false);
    localStorage.setItem('host_broadcast_mode_enabled', 'true');
    const { result } = renderHook(() => useHostViewState({ classroomHost: true }));
    expect(result.current.settings.hostPlaying).toBe(false);
  });

  it('Given an arcade host on a phone, Then the phone keeps player mode as before', () => {
    phoneViewport(true);
    const { result } = renderHook(() => useHostViewState({}));
    expect(result.current.settings.hostPlaying).toBe(true);
  });

  it('Given the host phase, Then a classroom room counts as a classroom host even when lesson data is missing', () => {
    const src = readFileSync(resolve(__dirname, '../useHostPhase.ts'), 'utf8');
    expect(src).toMatch(/classroomHost: !!lessonData \|\| !!isClassroomMode/);
  });
});
