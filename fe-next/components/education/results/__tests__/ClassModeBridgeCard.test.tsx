import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassModeBridgeCard } from '../ClassModeBridgeCard';
import type { ClassModeBridgeOffer } from '@/lib/education/classModeBridge';

const offered = vi.hoisted(() => vi.fn());
const accepted = vi.hoisted(() => vi.fn());

vi.mock('@/lib/education/classModeBridgeTelemetry', () => ({
  trackClassModeBridgeOffered: (...args: unknown[]) => offered(...args),
  trackClassModeBridgeAccepted: (...args: unknown[]) => accepted(...args),
}));

const CLASS_ID = '11111111-1111-4111-8111-111111111111';

const offer: ClassModeBridgeOffer = {
  title: 'Play again your way',
  context: "You were #2 in Ms. X's class",
  modes: [
    { id: 'solo_daily', label: 'Solo daily', href: `/en/classroom/play-again?class_id=${CLASS_ID}&mode=solo_daily&rank=2` },
    { id: 'quick_play', label: 'Quick play', href: `/en/classroom/play-again?class_id=${CLASS_ID}&mode=quick_play&rank=2` },
  ],
  event: { class_id: CLASS_ID },
};

describe('ClassModeBridgeCard', () => {
  beforeEach(() => {
    offered.mockClear();
    accepted.mockClear();
  });

  it('given a finished class round, when the card shows, then one tap offers each second mode and the offer is counted once', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ClassModeBridgeCard offer={offer} />);

    expect(screen.getByTestId('class-mode-bridge')).toHaveTextContent('Play again your way');
    expect(screen.getByTestId('class-mode-bridge-context')).toHaveTextContent("You were #2 in Ms. X's class");
    expect(screen.getByRole('link', { name: 'Solo daily' })).toHaveAttribute('href', offer.modes[0].href);
    expect(screen.getByRole('link', { name: 'Quick play' })).toHaveAttribute('href', offer.modes[1].href);
    expect(offered).toHaveBeenCalledTimes(1);
    expect(offered).toHaveBeenCalledWith({ class_id: CLASS_ID });

    rerender(<ClassModeBridgeCard offer={offer} />);
    expect(offered).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('link', { name: 'Quick play' }));
    expect(accepted).toHaveBeenCalledWith({ class_id: CLASS_ID, mode: 'quick_play' });
  });

  it('omits the placing line when the offer has none', () => {
    render(<ClassModeBridgeCard offer={{ ...offer, context: null }} />);
    expect(screen.queryByTestId('class-mode-bridge-context')).toBeNull();
  });
});
