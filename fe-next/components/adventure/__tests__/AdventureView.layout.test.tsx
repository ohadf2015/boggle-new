/**
 * AdventureView Layout Contract
 *
 * WorldMap requires a parent with definite height and flex-1 sizing to make its
 * scrollable overflow work correctly. This test pins that contract: the root
 * must be a definite-height flex column, the header must not grow, and the
 * content region must be flex-1 min-h-0 so that WorldMap's overflow-y-auto
 * becomes scrollable relative to the remaining viewport space, not the total
 * document height.
 *
 * Regression: before the fix, the root was min-h-dvh (auto-growing to content),
 * WorldMap was h-full (100% of parent), and scrollHeight equaled clientHeight
 * because the parent was larger than the viewport. The useLayoutEffect's
 * scrollToWorld math became a no-op: maxScroll = 0, clampedTop = 0 always.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const auth = { isAuthenticated: true, loading: false, user: { id: 'u1' } };
const progress = { completions: [], state: 'ready' as const, refresh: vi.fn() };

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => () => {} }));
vi.mock('@/hooks/useAdventureInventory', () => ({ useAdventureInventory: () => ({ inventory: [], refresh: vi.fn() }) }));
vi.mock('@/hooks/useAdventureAchievements', () => ({ useAdventureAchievements: () => ({ earnAchievement: vi.fn() }) }));
vi.mock('../play/useAdventureProgress', () => ({
  useAdventureProgress: () => progress,
}));
vi.mock('../WorldMap', () => ({ default: () => <div data-testid="world-map" /> }));
vi.mock('../CollectionPanel', () => ({ default: () => null }));
vi.mock('../play/AdventureLevel', () => ({ default: () => null }));
vi.mock('../play/SkinVault', () => ({ default: () => null }));
vi.mock('../AdventureGuestGate', () => ({
  AdventureGuestGate: ({ surface }: any) => <div data-testid={`guest-gate-${surface}`} />,
}));

import AdventureView from '../AdventureView';

describe('AdventureView layout contract (WorldMap scrolling)', () => {
  beforeEach(() => {
    progress.state = 'ready';
  });

  it('(RED) root is h-dvh flex flex-col (definite height, not min-h-dvh auto-growing)', () => {
    render(<AdventureView />);
    const root = document.querySelector('[class*="h-dvh"][class*="flex"][class*="flex-col"]');
    expect(root).toBeTruthy();
    // The page renders crawlable SEO content after the game in a flex column:
    // without shrink-0 a fixed h-dvh root is squeezed toward 0 (the Word Tower bug).
    expect(root!.className).toContain('shrink-0');
  });

  it('(RED) header has shrink-0 to prevent growing on content height', () => {
    render(<AdventureView />);
    const header = document.querySelector('header[class*="shrink-0"]');
    expect(header).toBeTruthy();
  });

  it('(RED) content region (loading/error/map wrapper) is flex-1 min-h-0 to receive remaining space', () => {
    render(<AdventureView />);
    const contentRegion = document.querySelector('[class*="flex-1"][class*="min-h-0"]');
    expect(contentRegion).toBeTruthy();
  });

  it('(RED) in ready state, world-map is rendered inside a flex container', () => {
    progress.state = 'ready';
    render(<AdventureView />);
    const worldMap = screen.getByTestId('world-map');
    const parent = worldMap.parentElement;
    // The parent must be a flex container (the content region flex-1 div)
    expect(parent?.className).toMatch(/flex/);
  });

  it('(RED) in loading state, loader is inside the flex-1 container (not fixed height)', () => {
    progress.state = 'loading';
    render(<AdventureView />);
    // In loading state, there's a grid with the spinner; just verify the flex-1 wrapper exists and is not hidden
    const contentRegion = document.querySelector('[class*="flex-1"][class*="min-h-0"]');
    expect(contentRegion).toBeTruthy();
    // The content region should have the loader's grid child
    const loaderGrid = contentRegion?.querySelector('.grid');
    expect(loaderGrid).toBeTruthy();
  });
});
