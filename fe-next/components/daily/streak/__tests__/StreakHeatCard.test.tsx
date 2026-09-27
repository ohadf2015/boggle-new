import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StreakHeatCard from '../StreakHeatCard';

const shareStreak = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
  },
}));

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}));

vi.mock('@/utils/streakShare', () => ({
  shareStreak: (...args: unknown[]) => shareStreak(...args),
}));

const baseProps = {
  streak: 30,
  cycleStart: '2026-09-03',
  completedDates: ['2026-09-03', '2026-09-04'],
  today: '2026-09-04',
  isClaimable: false,
  onClose: vi.fn(),
};

describe('StreakHeatCard', () => {
  beforeEach(() => {
    shareStreak.mockReset();
    shareStreak.mockResolvedValue(true);
  });

  it('shows the streak count as the hero element', () => {
    render(<StreakHeatCard {...baseProps} />);
    expect(screen.getByTestId('streak-heat-count')).toHaveTextContent('30');
  });

  it('shows the mascot for the streak tier, not a generic one', () => {
    render(<StreakHeatCard {...baseProps} />);
    // Day 30 is the "legendary" tier ⇒ molten marshmallow.
    expect(screen.getByTestId('mascot-streakMolten')).toBeInTheDocument();
  });

  it('escalates the mascot as the streak grows', () => {
    const { rerender } = render(<StreakHeatCard {...baseProps} streak={1} />);
    expect(screen.getByTestId('mascot-streakSpark')).toBeInTheDocument();

    rerender(<StreakHeatCard {...baseProps} streak={120} />);
    expect(screen.getByTestId('mascot-streakEternal')).toBeInTheDocument();
  });

  it('paints the tier gradient so the background gets hotter with the streak', () => {
    const { rerender } = render(<StreakHeatCard {...baseProps} streak={1} />);
    const cool = screen.getByTestId('streak-heat-card').getAttribute('style');

    rerender(<StreakHeatCard {...baseProps} streak={120} />);
    const hot = screen.getByTestId('streak-heat-card').getAttribute('style');

    expect(cool).not.toEqual(hot);
  });

  it('renders the seven-day cycle row', () => {
    render(<StreakHeatCard {...baseProps} />);
    expect(screen.getByTestId('streak-week-row')).toBeInTheDocument();
  });

  it('shares the streak when "show it off" is pressed', async () => {
    render(<StreakHeatCard {...baseProps} />);
    fireEvent.click(screen.getByTestId('streak-share-button'));
    await waitFor(() => expect(shareStreak).toHaveBeenCalledTimes(1));
    expect(shareStreak.mock.calls[0][0]).toMatchObject({ streak: 30, tierId: 'legendary' });
  });

  it('does not fire a second share while one is in flight', async () => {
    let release: (v: boolean) => void = () => {};
    shareStreak.mockImplementation(() => new Promise<boolean>(res => { release = res; }));

    render(<StreakHeatCard {...baseProps} />);
    const button = screen.getByTestId('streak-share-button');
    fireEvent.click(button);
    fireEvent.click(button);

    expect(shareStreak).toHaveBeenCalledTimes(1);
    release(true);
  });

  it('closes on continue', () => {
    const onClose = vi.fn();
    render(<StreakHeatCard {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('streak-continue-button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('uses no emoji in its own markup — icons and mascot assets only', () => {
    const { container } = render(<StreakHeatCard {...baseProps} />);
    expect(container.textContent ?? '').not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });
});
