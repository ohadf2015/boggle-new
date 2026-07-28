import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DirectionsTutorialOverlay } from './DirectionsTutorialOverlay';
import { DIRECTIONS_TUTORIAL_STORAGE_KEY } from '@/lib/tutorial/directionsTutorialStore';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('DirectionsTutorialOverlay', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.style.overflow = '';
  });

  it('renders nothing — tutorial removed per user request', () => {
    render(<DirectionsTutorialOverlay />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.queryByText('directionsTutorial.title')).toBeNull();
    expect(screen.queryByText('directionsTutorial.subtitle')).toBeNull();
  });

  it('renders nothing when already seen (show-once)', () => {
    window.localStorage.setItem(DIRECTIONS_TUTORIAL_STORAGE_KEY, '1');
    render(<DirectionsTutorialOverlay />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.queryByText('directionsTutorial.title')).toBeNull();
  });

  it('does not show when disabled', () => {
    render(<DirectionsTutorialOverlay enabled={false} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.queryByText('directionsTutorial.title')).toBeNull();
  });

  it('never persists storage — tutorial is completely removed', () => {
    render(<DirectionsTutorialOverlay />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(window.localStorage.getItem(DIRECTIONS_TUTORIAL_STORAGE_KEY)).toBeNull();
  });
});
