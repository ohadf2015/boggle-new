/**
 * "Get students in" — the real bottleneck: 70% of classes never get a student.
 * The code is the loudest thing on the card; copy puts the LINK on the
 * clipboard (a bare code is a dead end in WhatsApp); the projector is one tap.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const roster = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown, p?: Record<string, unknown>) => {
      const params = (typeof a === 'object' ? a : p) as Record<string, unknown> | undefined;
      return params ? `${k}:${JSON.stringify(params)}` : k;
    },
    language: 'en',
  }),
}));
vi.mock('../useClassRoster', () => ({ useClassRoster: () => roster() }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { GetStudentsInCard } from '../GetStudentsInCard';

const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 2 };

describe('<GetStudentsInCard>', () => {
  beforeEach(() => {
    roster.mockReturnValue({
      students: [
        { id: 's1', name: 'Ava', avatar: null },
        { id: 's2', name: 'Noam', avatar: null },
      ],
      loading: false,
      arrivals: [],
    });
  });

  it('Given a class, Then its join code is shown big and left-to-right', () => {
    render(<GetStudentsInCard classroom={CLASS} onOpenProjector={vi.fn()} />);
    const code = screen.getByTestId('hq-join-code');
    expect(code).toHaveTextContent('AB12CD');
    expect(code).toHaveAttribute('dir', 'ltr');
  });

  it('When copy is tapped, Then the join LINK (not the bare code) goes on the clipboard', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<GetStudentsInCard classroom={CLASS} onOpenProjector={vi.fn()} />);
    fireEvent.click(screen.getByTestId('hq-copy-link'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/en/join/AB12CD`));
  });

  it('When projector is tapped, Then the projector opens', () => {
    const onOpen = vi.fn();
    render(<GetStudentsInCard classroom={CLASS} onOpenProjector={onOpen} />);
    fireEvent.click(screen.getByTestId('hq-open-projector'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('Given two students, Then two seats are filled and the rest are ghosts', () => {
    render(<GetStudentsInCard classroom={CLASS} onOpenProjector={vi.fn()} />);
    expect(screen.getAllByTestId('hq-roster-seat')).toHaveLength(2);
    expect(screen.getAllByTestId('hq-roster-ghost').length).toBeGreaterThan(0);
    expect(screen.getByTestId('hq-joined-count')).toHaveTextContent('academy.hq.joinedLabel');
  });

  it('Given nobody yet, Then it says so and points at the code instead of an empty list', () => {
    roster.mockReturnValue({ students: [], loading: false, arrivals: [] });
    render(<GetStudentsInCard classroom={{ ...CLASS, member_count: 0 }} onOpenProjector={vi.fn()} />);
    expect(screen.getByTestId('hq-joined-count')).toHaveTextContent('academy.hq.nobodyYet');
    expect(screen.queryAllByTestId('hq-roster-seat')).toHaveLength(0);
  });

  it('Given a student who joins while the teacher watches, Then that seat lights up', () => {
    roster.mockReturnValue({
      students: [{ id: 's9', name: 'Lior', avatar: null }],
      loading: false,
      arrivals: ['s9'],
    });
    render(<GetStudentsInCard classroom={CLASS} onOpenProjector={vi.fn()} />);
    expect(screen.getByTestId('hq-roster-seat')).toHaveAttribute('data-new', '1');
  });

  it('Given a student with no avatar yet, Then the seat shows their initial, not a blank disc', () => {
    render(<GetStudentsInCard classroom={CLASS} onOpenProjector={vi.fn()} />);
    const initials = screen.getAllByTestId('hq-roster-initial');
    expect(initials.map((el) => el.textContent)).toEqual(['A', 'N']);
    expect(screen.queryAllByTestId('avatar')).toHaveLength(0);
  });

  it('Given a student with an avatar, Then the seat shows the avatar', () => {
    roster.mockReturnValue({
      students: [{ id: 's1', name: 'Ava', avatar: { body: 'x' } }],
      loading: false,
      arrivals: [],
    });
    render(<GetStudentsInCard classroom={CLASS} onOpenProjector={vi.fn()} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('Given the roster is still loading, Then it claims neither "nobody yet" nor a count', () => {
    roster.mockReturnValue({ students: [], loading: true, arrivals: [] });
    render(<GetStudentsInCard classroom={CLASS} onOpenProjector={vi.fn()} />);
    const count = screen.getByTestId('hq-joined-count');
    expect(count).not.toHaveTextContent('academy.hq.nobodyYet');
    expect(count).not.toHaveTextContent('academy.hq.joinedLabel');
  });
});
