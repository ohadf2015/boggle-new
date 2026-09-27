import { render, screen } from '@testing-library/react';
import { ClosestRivalsPanel } from '../ClosestRivalsPanel';
import { selectClosestRivals, type RivalInput } from '@/lib/leaderboard/selectClosestRivals';

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ userId }: { userId?: string }) => <span data-testid="avatar" data-uid={userId} />,
}));

// Minimal translation stub: echo the key (+ interpolate {n}) so assertions can
// target keys without depending on copy.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars && 'n' in vars ? `${key}:${vars.n}` : key,
  }),
}));

function p(id: string, score: number, isMe = false): RivalInput {
  return { id, name: id, score, isMe };
}

describe('ClosestRivalsPanel', () => {
  it('renders nothing when the view is null', () => {
    const { container } = render(<ClosestRivalsPanel view={null} />);
    expect(container.querySelector('[data-testid="closest-rivals-panel"]')).toBeNull();
  });

  it('renders a row per rival + me, marking me', () => {
    const view = selectClosestRivals(
      [p('r1', 60), p('r2', 55), p('me', 50, true), p('r3', 48)],
      3,
    );
    render(<ClosestRivalsPanel view={view} />);
    expect(screen.getByTestId('closest-rivals-panel')).toBeInTheDocument();
    expect(screen.getByTestId('rivals-row-me')).toHaveAttribute('data-you', 'true');
    expect(screen.getByTestId('rivals-row-r1')).toHaveAttribute('data-you', 'false');
    // 4 rows total
    expect(screen.getAllByTestId(/^rivals-row-/)).toHaveLength(4);
  });

  it('exposes true global rank and direction per row', () => {
    const view = selectClosestRivals(
      [p('top', 95), p('r1', 60), p('me', 50, true), p('r3', 48)],
      3,
    );
    render(<ClosestRivalsPanel view={view} />);
    const r1 = screen.getByTestId('rivals-row-r1');
    expect(r1).toHaveAttribute('data-rank', '2');
    expect(r1).toHaveAttribute('data-direction', 'ahead');
    const r3 = screen.getByTestId('rivals-row-r3');
    expect(r3).toHaveAttribute('data-direction', 'behind');
    expect(screen.getByTestId('rivals-row-me')).toHaveAttribute('data-direction', 'tie');
  });

  it('flags the adjacent close rival as imminent (about to pass / be passed)', () => {
    // me=50, r1 ahead by 3 (adjacent, close) → imminent; far ahead by 45 → not.
    const view = selectClosestRivals(
      [p('far', 95), p('r1', 53), p('me', 50, true), p('low', 20)],
      3,
    );
    render(<ClosestRivalsPanel view={view} pulseThreshold={20} />);
    expect(screen.getByTestId('rivals-row-r1')).toHaveAttribute('data-imminent', 'true');
    expect(screen.getByTestId('rivals-row-far')).toHaveAttribute('data-imminent', 'false');
  });

  it('does not flag imminent when the adjacent rival is beyond the threshold', () => {
    const view = selectClosestRivals([p('r1', 90), p('me', 50, true)], 3);
    render(<ClosestRivalsPanel view={view} pulseThreshold={20} />);
    expect(screen.getByTestId('rivals-row-r1')).toHaveAttribute('data-imminent', 'false');
  });

  it('renders the live player count in the header', () => {
    const view = selectClosestRivals([p('r1', 60), p('me', 50, true), p('r2', 40)], 3);
    render(<ClosestRivalsPanel view={view} />);
    // header count key interpolated with total players (3)
    expect(screen.getByTestId('closest-rivals-panel').textContent).toContain('3');
  });
});
