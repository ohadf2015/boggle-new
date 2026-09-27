import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GamePausedOverlay } from '../GamePausedOverlay';

const mockUseLanguage = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

describe('GamePausedOverlay', () => {
  beforeEach(() => {
    mockUseLanguage.mockReturnValue({ language: 'en', t: (k: string) => k, dir: 'ltr' });
  });

  it('announces the pause to screen readers and shows the student copy', () => {
    render(<GamePausedOverlay />);
    const overlay = screen.getByTestId('game-paused-overlay');
    expect(overlay).toHaveAttribute('role', 'status');
    expect(overlay).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('education.liveControls.pausedTitle')).toBeInTheDocument();
    expect(screen.getByText('education.liveControls.pausedBody')).toBeInTheDocument();
  });

  it('covers the whole screen so the board underneath cannot be interacted with', () => {
    render(<GamePausedOverlay />);
    const overlay = screen.getByTestId('game-paused-overlay');
    expect(overlay.className).toMatch(/\bfixed\b/);
    expect(overlay.className).toMatch(/\binset-0\b/);
    expect(overlay.className).toMatch(/pointer-events-auto/);
  });

  it('tells the teacher how to resume instead of "paused by your teacher"', () => {
    render(<GamePausedOverlay isHost />);
    expect(screen.getByText('education.liveControls.pausedBodyHost')).toBeInTheDocument();
    expect(screen.queryByText('education.liveControls.pausedBody')).toBeNull();
  });

  it('is RTL-safe: sets dir="rtl" for Hebrew', () => {
    mockUseLanguage.mockReturnValue({ language: 'he', t: (k: string) => k, dir: 'rtl' });
    render(<GamePausedOverlay />);
    expect(screen.getByTestId('game-paused-overlay')).toHaveAttribute('dir', 'rtl');
  });
});
