import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

import RelicBar from '../RelicBar';
import type { RelicId } from '@/lib/adventure/play/relics';

describe('RelicBar popover DOM structure', () => {
  it('popover has no nested buttons (RelicChip is direct child, not wrapped)', () => {
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink', 'echo-stone'] as RelicId[];

    const { container } = render(
      <RelicBar relics={relics} size="xs" maxVisible={4} />
    );

    // Open the popover by clicking +N
    const moreChip = screen.getByTestId('run-hud-more-relics');
    fireEvent.click(moreChip);

    // Verify popover exists
    const popover = screen.getByTestId('run-hud-relic-popover');
    expect(popover).toBeInTheDocument();

    // Assert: no nested buttons (button > button)
    const nestedButtons = popover.querySelector('button button');
    expect(nestedButtons).toBeNull();
  });

  it('popover shows exactly the hidden relics (not visible ones)', () => {
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink', 'echo-stone'] as RelicId[];

    render(
      <RelicBar relics={relics} size="xs" maxVisible={4} />
    );

    const moreChip = screen.getByTestId('run-hud-more-relics');
    fireEvent.click(moreChip);

    const popover = screen.getByTestId('run-hud-relic-popover');

    // Should have exactly 2 relic chips in the popover (the hidden ones)
    const relicChips = popover.querySelectorAll('[data-relic]');
    expect(relicChips).toHaveLength(2);

    // Should be twin-ink and echo-stone (the last two)
    expect(relicChips[0]).toHaveAttribute('data-relic', 'twin-ink');
    expect(relicChips[1]).toHaveAttribute('data-relic', 'echo-stone');
  });

  it('+N chip has bdi[dir="ltr"] for correct RTL rendering', () => {
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink', 'echo-stone'] as RelicId[];

    render(
      <RelicBar relics={relics} size="xs" maxVisible={4} />
    );

    const moreChip = screen.getByTestId('run-hud-more-relics');
    const bdiElement = moreChip.querySelector('bdi[dir="ltr"]');

    expect(bdiElement).toBeInTheDocument();
    expect(bdiElement?.textContent).toBe('+2');
  });

  it('popover uses start-0 for RTL support instead of left-0', () => {
    const relics: RelicId[] = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink', 'echo-stone'] as RelicId[];

    render(
      <RelicBar relics={relics} size="xs" maxVisible={4} />
    );

    const moreChip = screen.getByTestId('run-hud-more-relics');
    fireEvent.click(moreChip);

    const popover = screen.getByTestId('run-hud-relic-popover');

    expect(popover).toHaveClass('start-0');
    expect(popover).not.toHaveClass('left-0');
  });
});
