import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

import RelicBar from '../RelicBar';
import type { RelicId } from '@/lib/adventure/play/relics';

describe('RelicBar ref lifecycle - overflow chips', () => {
  it('overflow relic stays accessible after popover open/close cycle', () => {
    // Test guards against the ref deletion issue where popover chip unmount
    // deletes the rail chip's entry from chips.current Map.
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink', 'echo-stone'] as RelicId[];

    const { container } = render(
      <RelicBar relics={relics} size="xs" maxVisible={4} />
    );

    // Find the rail's overflow relic chip (twin-ink)
    const railChips = container.querySelectorAll('ul > li[data-adv-overflow] button[data-relic]');
    const twinInkRailChip = Array.from(railChips).find((el) => el.getAttribute('data-relic') === 'twin-ink');
    expect(twinInkRailChip).toBeDefined();

    // Open popover
    const moreButton = screen.getByTestId('run-hud-more-relics');
    fireEvent.click(moreButton);
    const popover = screen.getByTestId('run-hud-relic-popover');
    expect(popover).toBeInTheDocument();

    // Close popover
    fireEvent.click(moreButton);
    expect(screen.queryByTestId('run-hud-relic-popover')).not.toBeInTheDocument();

    // The rail chip should still be clickable and maintain its DOM reference
    const railChipAfterClose = container.querySelector('ul > li[data-adv-overflow] button[data-relic="twin-ink"]');
    expect(railChipAfterClose).toBe(twinInkRailChip);

    // Verify it has proper attributes that identify it
    expect(railChipAfterClose).toHaveAttribute('data-relic', 'twin-ink');
    expect(railChipAfterClose).toHaveClass('rounded-lg');
  });
});
