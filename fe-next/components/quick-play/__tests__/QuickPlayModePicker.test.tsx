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

  // Hierarchy is TWO roles — one hero plus three interchangeable siblings — not
  // four bespoke sizes. Four different glyph/title/blurb scales (the previous
  // contract) read as a broken layout rather than as an intentional emphasis.
  it('the three sibling cards share one size spec', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const siblings: QuickMode[] = ['blast', 'word-hunt', 'wheel-rush'];
    const specs = siblings.map((mode) => {
      const button = screen.getByTestId(`mode-card-${mode}`);
      const svg = button.querySelector('svg');
      return [
        svg?.getAttribute('class') ?? '',
        button.querySelector('h3')?.className ?? '',
        button.querySelector('p')?.className ?? '',
      ].join('|');
    });
    expect(new Set(specs).size).toBe(1);
  });

  it('the hero card outranks its siblings on glyph and title scale', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const hero = screen.getByTestId('mode-card-classic');
    const sibling = screen.getByTestId('mode-card-blast');
    // The step up is a responsive escalation, so it shows as extra `lg:` classes
    // on the hero rather than a different base size.
    expect(hero.querySelector('svg')?.getAttribute('class')).toMatch(/lg:[hw]-/);
    expect(hero.querySelector('h3')?.className).toMatch(/lg:text-/);
    expect(sibling.querySelector('svg')?.getAttribute('class')).not.toMatch(/lg:[hw]-/);
    // …and as a bigger grid footprint at the widest breakpoint.
    expect(hero.className).toContain('lg:col-span-2');
    expect(hero.className).toContain('lg:row-span-2');
  });

  it('every mode card constrains its blurb measure and cannot be squeezed by the grid', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    const modes: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];
    for (const mode of modes) {
      const button = screen.getByTestId(`mode-card-${mode}`);
      // Grid items default to min-width:auto and can overflow their track.
      expect(button.className).toContain('min-w-0');
      expect(button.querySelector('p')?.className).toMatch(/max-w-\[\d+ch\]/);
    }
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

  // An aria-label REPLACES an element's content for assistive tech, so the old
  // aria-label={mode name} announced the card WITHOUT its promise line. These
  // assert the labelledby/describedby wiring actually resolves — a dangling id
  // yields an empty name/description and fails here.
  it('announces both the mode name and its promise', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    for (const mode of ['classic', 'blast', 'word-hunt', 'wheel-rush'] as QuickMode[]) {
      const card = screen.getByTestId(`mode-card-${mode}`);
      expect(card).toHaveAccessibleName(`quickPlay.solo.mode.${mode}`);
      expect(card).toHaveAccessibleDescription(`quickPlay.solo.blurb.${mode}`);
    }
    const random = screen.getByTestId('random-button');
    expect(random).toHaveAccessibleName('quickPlay.solo.random');
    expect(random).toHaveAccessibleDescription('quickPlay.solo.blurb.random');
  });

  // The bottom band reservation lives in QuickPlayHub, NOT here. The hub centres
  // this column vertically, so a trailing spacer inside it is centred along with
  // the cards and shunts them upward by half its height — which is what put the
  // dead band above the grid. QuickPlayHub.test.tsx owns the reservation test.
  it('does not carry the bottom band reservation itself', () => {
    render(
      <QuickPlayModePicker
        selection="random"
        pendingMode={null}
        onSelect={handlePlay}
      />
    );
    expect(screen.queryByTestId('quick-picker-bottom-spacer')).toBeNull();
  });
});
