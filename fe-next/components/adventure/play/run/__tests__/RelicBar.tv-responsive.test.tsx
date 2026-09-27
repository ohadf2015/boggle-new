import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

import RelicBar from '../RelicBar';
import type { RelicId } from '@/lib/adventure/play/relics';

describe('RelicBar TV/landscape responsiveness', () => {
  it('overflow relics are marked with data-adv-overflow and hidden on phone (no lg: breakpoint)', () => {
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink', 'echo-stone'] as RelicId[];

    const { container } = render(
      <RelicBar relics={relics} size="xs" maxVisible={4} />
    );

    // Find all chip list items (6 relics + 1 +N button = 7 total)
    const chips = container.querySelectorAll('ul > li');
    expect(chips).toHaveLength(7);

    // First 4 relic items (0-3) should NOT have data-adv-overflow
    for (let i = 0; i < 4; i++) {
      expect(chips[i]).not.toHaveAttribute('data-adv-overflow');
    }

    // Items 4-5 are the overflow relics (twin-ink, echo-stone)
    for (let i = 4; i < 6; i++) {
      expect(chips[i]).toHaveAttribute('data-adv-overflow', 'true');
      expect(chips[i]).toHaveClass('hidden');
      // Verify NO lg:flex or lg:hidden classes (media queries handled by CSS)
      const classList = chips[i].className;
      expect(classList).not.toMatch(/\b(sm|md|lg|xl|2xl):/);
    }

    // Item 6 is the +N button (visible on phone, hidden on TV via CSS)
    expect(chips[6]).toHaveAttribute('data-adv-more-chip');
    // +N button is not hidden — visibility is controlled by CSS media query
    expect(chips[6].className).not.toMatch(/\bhidden\b/);
    // Verify NO lg: breakpoint classes
    expect(chips[6].className).not.toMatch(/\b(sm|md|lg|xl|2xl):/);
  });

  it('+N button has no lg: breakpoint classes (media query handled by CSS)', () => {
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink'] as RelicId[];

    const { container } = render(
      <RelicBar relics={relics} size="xs" maxVisible={4} />
    );

    // Find the more chip container
    const moreChip = container.querySelector('[data-adv-more-chip]');
    expect(moreChip).toBeInTheDocument();
    // Verify NO lg: classes
    expect(moreChip!.className).not.toMatch(/\blg:/);
  });

  it('when maxVisible is null, all relics render without overflow marking', () => {
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink'] as RelicId[];

    const { container } = render(
      <RelicBar relics={relics} size="xs" />
    );

    // Find all chip list items
    const chips = container.querySelectorAll('ul > li');
    expect(chips).toHaveLength(5); // All 5 relics rendered

    // None should have data-adv-overflow
    for (const chip of chips) {
      expect(chip).not.toHaveAttribute('data-adv-overflow');
    }

    // No more button
    expect(screen.queryByTestId('run-hud-more-relics')).not.toBeInTheDocument();
  });

  it('overflow relic in rail remains accessible via chips map after popover open/close cycle', () => {
    // This test guards against the ref lifecycle issue where both the rail chip
    // and popover chip use the same chips.current map with the same relic id as key.
    // When the popover chip unmounts, it should not delete the rail chip's entry.
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink', 'echo-stone'] as RelicId[];

    const { container } = render(
      <RelicBar relics={relics} size="xs" maxVisible={4} />
    );

    // Find the rail's overflow relic (twin-ink, which is hidden)
    const railChips = container.querySelectorAll('ul > li[data-adv-overflow] button');
    expect(railChips).toHaveLength(2); // twin-ink and echo-stone

    const overflowChip = railChips[0];
    expect(overflowChip).toHaveAttribute('data-relic', 'twin-ink');

    // Open the popover
    const moreButton = screen.getByTestId('run-hud-more-relics');
    fireEvent.click(moreButton);

    // Verify popover is visible and contains the overflow relics
    const popover = screen.getByTestId('run-hud-relic-popover');
    expect(popover).toBeInTheDocument();
    const popoverChips = popover.querySelectorAll('button[data-relic]');
    expect(popoverChips).toHaveLength(2);

    // Close the popover by clicking the more button again
    fireEvent.click(moreButton);
    expect(popover).not.toBeInTheDocument();

    // The rail chip button should still exist and be accessible
    const railChipAfterClose = container.querySelector('ul > li[data-adv-overflow] button[data-relic="twin-ink"]');
    expect(railChipAfterClose).toBeInTheDocument();
    expect(railChipAfterClose).toBe(overflowChip);
  });
});
