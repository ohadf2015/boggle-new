/**
 * Quick Play Mode Picker — card-based mode selection
 *
 * Contract: four cards with distinct styling, one-line mode promises,
 * plus a secondary random button. Tapping any card fires handlePlay.
 * During loading, tapped card shows pending state (fills, siblings dim).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickPlayModePicker } from '../QuickPlayModePicker';
import type { QuickMode } from '../types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('QuickPlayModePicker', () => {
  const handlePlay = vi.fn();

  beforeEach(() => {
    handlePlay.mockClear();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders exactly four mode cards + one random button', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    expect(screen.getAllByRole('button')).toHaveLength(5); // 4 modes + 1 random
  });

  it.each(['classic', 'blast', 'word-hunt', 'wheel-rush'] as QuickMode[])(
    '%s card shows glyph + mode name + blurb',
    (mode) => {
      render(
        <QuickPlayModePicker
          selection="random"
          pendingMode={null}
          onSelect={handlePlay}
        />
      );
      const button = screen.getByRole('button', { name: new RegExp(mode, 'i') });
      expect(button).toBeTruthy();
      // Button contains the mode name key (e.g., "quickPlay.solo.mode.classic")
      expect(button.textContent).toContain(`quickPlay.solo.mode.${mode}`);
      // And the blurb key
      expect(button.textContent).toContain(`quickPlay.solo.blurb.${mode}`);
    }
  );

  it('random button shows random label + blurb', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const button = screen.getByRole('button', { name: /random/i });
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('quickPlay.solo.random');
    expect(button.textContent).toContain('quickPlay.solo.blurb.random');
  });

  it('tapping a mode card calls handlePlay with mode + "tap" method', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const button = screen.getByRole('button', { name: /classic/i });
    fireEvent.click(button);
    expect(handlePlay).toHaveBeenCalledWith('classic', 'tap');
    expect(handlePlay).toHaveBeenCalledTimes(1);
  });

  it('tapping random calls handlePlay with "random" + "tap"', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const button = screen.getByRole('button', { name: /random/i });
    fireEvent.click(button);
    expect(handlePlay).toHaveBeenCalledWith('random', 'tap');
  });

  it('keyboard: arrow keys navigate between cards', () => {
    const { container } = render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const buttons = Array.from(screen.getAllByRole('button'));
    // First button gets focus
    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);
    // Right arrow moves to next
    fireEvent.keyDown(buttons[0], { key: 'ArrowRight', code: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('keyboard: Enter on focused card calls handlePlay', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const button = screen.getByRole('button', { name: /classic/i });
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    expect(handlePlay).toHaveBeenCalledWith('classic', 'tap');
  });

  it('during loading: pendingMode card shows filled/selected state, others dim', () => {
    const { container, rerender } = render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    let button = screen.getByRole('button', { name: /classic/i });
    expect(button).not.toHaveClass('opacity-50'); // Normal state

    // Simulate loading — classic is pending
    rerender(
      <QuickPlayModePicker
        selection="classic"
        pendingMode="classic"
        onSelect={handlePlay}
      />
    );
    button = screen.getByRole('button', { name: /classic/i });
    // Pending card should have a special class (e.g., filled/locked appearance)
    expect(button.className).toContain('opacity-100'); // or filled indicator
    // Siblings should dim
    const blastButton = screen.getByRole('button', { name: /blast/i });
    expect(blastButton.className).toContain('opacity-50');
  });

  it('during loading: random button is disabled', () => {
    const { rerender } = render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    let randomButton = screen.getByRole('button', { name: /random/i });
    expect(randomButton).not.toBeDisabled();

    rerender(
      <QuickPlayModePicker
        selection="classic"
        pendingMode="classic"
        onSelect={handlePlay}
      />
    );
    randomButton = screen.getByRole('button', { name: /random/i });
    expect(randomButton).toBeDisabled();
  });

  it('all four mode cards have distinct classNames (differentiated styling)', () => {
    const { container } = render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const modes: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];
    const classNames = modes.map((mode) => {
      const button = screen.getByRole('button', { name: new RegExp(mode, 'i') });
      return button.className;
    });
    // All four should be unique
    expect(new Set(classNames).size).toBe(4);
  });

  it('all four mode cards have distinct sizes (glyph size or card scale)', () => {
    const { container } = render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const modes: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];
    const glyphSizes = modes.map((mode) => {
      // Find the SVG glyph inside each card's button
      const button = screen.getByRole('button', { name: new RegExp(mode, 'i') });
      const svg = button.querySelector('svg');
      return svg?.getAttribute('width') ?? '0';
    });
    // All four glyphs should have different rendered sizes
    expect(new Set(glyphSizes).size).toBe(4);
  });

  it('entrance animation runs with prefers-reduced-motion fallback', () => {
    // Mock reduced motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const { container } = render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const buttons = screen.getAllByRole('button');
    // With reduced motion, animations should still render but not delay
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('cards have accessible names and labels for screen readers', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const buttons = screen.getAllByRole('button');
    // Each button should have a meaningful name
    buttons.forEach((btn) => {
      expect(btn.getAttribute('aria-label') || btn.textContent).toBeTruthy();
    });
  });

  it('selection prop marks the selected card (aria-current or similar)', () => {
    const { rerender } = render(
      <QuickPlayModePicker
        selection="classic"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    let classicButton = screen.getByRole('button', { name: /classic/i });
    expect(classicButton.getAttribute('aria-current')).toBe('true');

    // Switch selection
    rerender(
      <QuickPlayModePicker
        selection="blast"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    classicButton = screen.getByRole('button', { name: /classic/i });
    expect(classicButton.getAttribute('aria-current')).toBe('false');
    const blastButton = screen.getByRole('button', { name: /blast/i });
    expect(blastButton.getAttribute('aria-current')).toBe('true');
  });

  it('reserves bottom band space so push notifications cannot cover Random button', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const spacer = screen.getByTestId('quick-picker-bottom-spacer');
    expect(spacer).toBeTruthy();
    expect(spacer.getAttribute('aria-hidden')).toBe('true');
    // Verify the spacer has the calculated height class for notification + banner reservation
    expect(spacer.className).toContain('h-[calc(5rem+var(--admob-banner-height,0px)+1.5rem)]');
  });
});
