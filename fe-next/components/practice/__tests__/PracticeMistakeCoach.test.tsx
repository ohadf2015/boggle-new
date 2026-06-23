/**
 * PracticeMistakeCoach — controlled friendly popup that appears on
 * detected mid-game mistakes (not a word, missing center letter, etc).
 * Hook owns dedup state; component is pure render.
 */
import React from 'react';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playButtonClickSound: vi.fn(),
  }),
}));

vi.mock('@/utils/haptics', () => ({
  haptics: { tap: vi.fn() },
}));

import PracticeMistakeCoach, { usePracticeMistakeCoach } from '../PracticeMistakeCoach';

describe('usePracticeMistakeCoach', () => {
  it('starts inactive', () => {
    const { result } = renderHook(() => usePracticeMistakeCoach());
    expect(result.current.active).toBeNull();
  });

  it('trigger() activates the kind on first call', () => {
    const { result } = renderHook(() => usePracticeMistakeCoach());
    act(() => {
      result.current.trigger('notAWord');
    });
    expect(result.current.active).toBe('notAWord');
  });

  it('trigger() is a no-op for the same kind a second time (session dedup)', () => {
    const { result } = renderHook(() => usePracticeMistakeCoach());
    act(() => result.current.trigger('notAWord'));
    act(() => result.current.close());
    act(() => result.current.trigger('notAWord'));
    expect(result.current.active).toBeNull();
  });

  it('trigger() fires for different kinds independently', () => {
    const { result } = renderHook(() => usePracticeMistakeCoach());
    act(() => result.current.trigger('notAWord'));
    act(() => result.current.close());
    act(() => result.current.trigger('diagonalsOk'));
    expect(result.current.active).toBe('diagonalsOk');
  });

  it('close() clears the active kind', () => {
    const { result } = renderHook(() => usePracticeMistakeCoach());
    act(() => result.current.trigger('notAWord'));
    act(() => result.current.close());
    expect(result.current.active).toBeNull();
  });

  it('openManual() bypasses dedup and forces the popup open', () => {
    const { result } = renderHook(() => usePracticeMistakeCoach());
    act(() => result.current.trigger('notAWord'));
    act(() => result.current.close());
    act(() => result.current.openManual('notAWord'));
    // Even though notAWord was already shown via trigger, openManual reopens.
    expect(result.current.active).toBe('notAWord');
  });
});

describe('<PracticeMistakeCoach>', () => {
  it('renders nothing when kind is null', () => {
    render(<PracticeMistakeCoach kind={null} mode="classic" onClose={() => {}} />);
    expect(screen.queryByTestId('practice-mistake-coach')).toBeNull();
  });

  it('renders dialog when kind is set', () => {
    render(<PracticeMistakeCoach kind="notAWord" mode="classic" onClose={() => {}} />);
    expect(screen.getByTestId('practice-mistake-coach')).toBeInTheDocument();
    expect(screen.getByTestId('practice-mistake-coach-panel-notAWord')).toBeInTheDocument();
  });

  it('renders the localized title + body for the kind', () => {
    render(<PracticeMistakeCoach kind="diagonalsOk" mode="classic" onClose={() => {}} />);
    expect(screen.getByText('practice.mistakeCoach.diagonalsOk.title')).toBeInTheDocument();
    expect(screen.getByText('practice.mistakeCoach.diagonalsOk.body')).toBeInTheDocument();
  });

  it('CTA click calls onClose', () => {
    const onClose = vi.fn();
    render(<PracticeMistakeCoach kind="notAWord" mode="classic" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('practice-mistake-coach-cta'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dismiss × button calls onClose', () => {
    const onClose = vi.fn();
    render(<PracticeMistakeCoach kind="notAWord" mode="classic" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('practice-mistake-coach-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop click calls onClose', () => {
    const onClose = vi.fn();
    render(<PracticeMistakeCoach kind="notAWord" mode="classic" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('practice-mistake-coach-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ESC key calls onClose', () => {
    const onClose = vi.fn();
    render(<PracticeMistakeCoach kind="notAWord" mode="classic" onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ESC listener does not fire when kind is null (closed state)', () => {
    const onClose = vi.fn();
    render(<PracticeMistakeCoach kind={null} mode="classic" onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  // Regression: panel revealed via a Framer entrance starting at opacity 0.
  // When the animation didn't run (observed on Hebrew/RTL) only the dark
  // backdrop showed. Reveal must be a CSS entrance with a visible resting
  // state, never a stuck inline opacity:0.
  it('reveals the panel via a CSS entrance, never a stuck inline opacity:0', () => {
    render(<PracticeMistakeCoach kind="notAWord" mode="classic" onClose={() => {}} />);
    const panel = screen.getByTestId('practice-mistake-coach-panel-notAWord');
    expect(panel.className).toContain('animate-pop-in');
    expect(panel.style.opacity).not.toBe('0');
  });

  it('switches images per kind via deterministic data-testid', () => {
    const { rerender } = render(
      <PracticeMistakeCoach kind="notAWord" mode="classic" onClose={() => {}} />,
    );
    expect(screen.getByTestId('practice-mistake-coach-panel-notAWord')).toBeInTheDocument();

    rerender(<PracticeMistakeCoach kind="needsCenter" mode="wheelRush" onClose={() => {}} />);
    expect(screen.getByTestId('practice-mistake-coach-panel-needsCenter')).toBeInTheDocument();
    expect(screen.queryByTestId('practice-mistake-coach-panel-notAWord')).toBeNull();
  });
});
