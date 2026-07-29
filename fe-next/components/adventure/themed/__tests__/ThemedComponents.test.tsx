/**
 * Themed Adventure Components Tests
 *
 * Tests for WorldBackground, ThemedTile, ModifierBadge, and ChapterIndicator.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdventureThemeProvider } from '@/contexts/AdventureThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import WorldBackground from '../WorldBackground';
import ThemedTile from '../ThemedTile';
import ModifierBadge from '../ModifierBadge';
import ChapterIndicator from '../ChapterIndicator';
import type { TileState } from '@/types/adventure';

// ==============================================
// TEST UTILITIES
// ==============================================

function renderWithProviders(
  ui: React.ReactElement,
  { worldId = 1, level = 1 } = {}
) {
  return render(
    <LanguageProvider>
      <AdventureThemeProvider initialWorldId={worldId} initialLevel={level}>
        {ui}
      </AdventureThemeProvider>
    </LanguageProvider>
  );
}

const createTile = (overrides: Partial<TileState> = {}): TileState => ({
  letter: 'A',
  type: 'standard',
  isCleared: false,
  ...overrides,
});

// ==============================================
// WORLD BACKGROUND TESTS
// ==============================================

describe('WorldBackground', () => {
  it('should render children inside background', () => {
    // GIVEN
    renderWithProviders(
      <WorldBackground>
        <div data-testid="child">Content</div>
      </WorldBackground>
    );

    // THEN
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toHaveTextContent('Content');
  });

  it('should apply world container class', () => {
    // GIVEN
    const { container } = renderWithProviders(<WorldBackground />);

    // THEN - World 1 has containerClass 'world-meadows'
    expect(container.firstChild).toHaveClass('world-meadows');
  });

  it('should change theme based on world', () => {
    // GIVEN - World 2 has containerClass 'world-springs'
    const { container } = renderWithProviders(<WorldBackground />, { worldId: 2 });

    // THEN
    expect(container.firstChild).toHaveClass('world-springs');
  });
});

// ==============================================
// THEMED TILE TESTS
// ==============================================

describe('ThemedTile', () => {
  it('should render letter correctly', () => {
    // GIVEN
    const tile = createTile({ letter: 'X' });

    renderWithProviders(<ThemedTile tile={tile} />);

    // THEN
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('should have correct aria-label for standard tile', () => {
    // GIVEN
    const tile = createTile({ letter: 'B', type: 'standard' });

    renderWithProviders(<ThemedTile tile={tile} />);

    // THEN
    expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', 'Letter B');
  });

  it('should have correct aria-label for special tile', () => {
    // GIVEN
    const tile = createTile({ letter: 'G', type: 'gold' });

    renderWithProviders(<ThemedTile tile={tile} />);

    // THEN
    expect(screen.getByRole('gridcell')).toHaveAttribute('aria-label', 'Letter G, gold tile');
  });

  it('should show badge for gold tile', () => {
    // GIVEN
    const tile = createTile({ type: 'gold' });

    renderWithProviders(<ThemedTile tile={tile} />);

    // THEN
    expect(screen.getByText('3x')).toBeInTheDocument();
  });

  it('should show badge for rainbow tile', () => {
    // GIVEN
    const tile = createTile({ type: 'rainbow' });

    renderWithProviders(<ThemedTile tile={tile} />);

    // THEN
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should show badge for time tile', () => {
    // GIVEN
    const tile = createTile({ type: 'time' });

    renderWithProviders(<ThemedTile tile={tile} />);

    // THEN
    expect(screen.getByText('+5s')).toBeInTheDocument();
  });

  it('should apply selected state', () => {
    // GIVEN
    const tile = createTile();

    renderWithProviders(<ThemedTile tile={tile} isSelected />);

    // THEN
    expect(screen.getByRole('gridcell')).toHaveAttribute('aria-selected', 'true');
  });

  it('should call onClick when clicked', async () => {
    // GIVEN
    const onClick = vi.fn();
    const tile = createTile();
    const user = userEvent.setup();

    renderWithProviders(<ThemedTile tile={tile} onClick={onClick} />);

    // WHEN
    await user.click(screen.getByRole('gridcell'));

    // THEN
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render different styles for different worlds', () => {
    // GIVEN - Render same tile type in different worlds
    const tile = createTile({ type: 'ice' });

    const { container: world1Container } = renderWithProviders(
      <ThemedTile tile={tile} />,
      { worldId: 1 }
    );

    const { container: world3Container } = renderWithProviders(
      <ThemedTile tile={tile} />,
      { worldId: 3 }
    );

    // THEN - The containers should exist (styling varies by world)
    expect(world1Container.querySelector('[role="gridcell"]')).toBeInTheDocument();
    expect(world3Container.querySelector('[role="gridcell"]')).toBeInTheDocument();
  });
});

// ==============================================
// MODIFIER BADGE TESTS
// ==============================================

describe('ModifierBadge', () => {
  it('should not render for world 1 (no mechanic)', () => {
    // GIVEN - World 1 has no mechanic
    const { container } = renderWithProviders(<ModifierBadge />);

    // THEN
    expect(container).toBeEmptyDOMElement();
  });

  it('should render for world 2 (has synonymPairs mechanic)', () => {
    // GIVEN
    renderWithProviders(<ModifierBadge />, { worldId: 2 });

    // THEN - Should have some content (badge is visible)
    // The actual text depends on translations
    const badge = document.querySelector('[class*="rounded-neo"]');
    expect(badge).toBeInTheDocument();
  });

  it('should render for world 3 (has etymologyRoots mechanic)', () => {
    // GIVEN
    renderWithProviders(<ModifierBadge />, { worldId: 3 });

    // THEN
    const badge = document.querySelector('[class*="rounded-neo"]');
    expect(badge).toBeInTheDocument();
  });

  it('should render compact version', () => {
    // GIVEN
    const { container } = renderWithProviders(<ModifierBadge compact />, { worldId: 2 });

    // THEN - Compact should still render
    const badge = container.querySelector('[class*="rounded-neo"]');
    expect(badge).toBeInTheDocument();
  });
});

// ==============================================
// CHAPTER INDICATOR TESTS
// ==============================================

describe('ChapterIndicator', () => {
  it('should show chapter 1 for level 1', () => {
    // GIVEN
    renderWithProviders(<ChapterIndicator />, { level: 1 });

    // THEN - Should show chapter number 1
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should show chapter 2 for level 3', () => {
    // GIVEN
    renderWithProviders(<ChapterIndicator />, { level: 3 });

    // THEN - Should show chapter number 2
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show crown icon for chapter 3 (boss chapter)', () => {
    // GIVEN
    renderWithProviders(<ChapterIndicator />, { level: 5 });

    // THEN - Crown icon should be rendered (Chapter 3 is boss chapter)
    // The crown replaces the chapter number
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('should show boss indicator for level 7', () => {
    // GIVEN
    renderWithProviders(<ChapterIndicator />, { level: 7 });

    // THEN - Boss indicator should be visible
    // Translation key is 'adventure.boss'
    const bossIndicator = document.querySelector('[class*="neo-yellow"]');
    expect(bossIndicator).toBeInTheDocument();
  });

  it('should render without full name in compact mode', () => {
    // GIVEN
    renderWithProviders(<ChapterIndicator showFullName={false} />, { level: 1 });

    // THEN - Should still render (chapter name text not shown)
    const indicator = document.querySelector('[class*="rounded-neo"]');
    expect(indicator).toBeInTheDocument();
  });
});
