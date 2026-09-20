// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EslPlayableDemo } from '../EslPlayableDemo';

const mockTrack = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrack(...args),
}));

describe('EslPlayableDemo', () => {
  beforeEach(() => mockTrack.mockClear());
  afterEach(() => vi.useRealTimers());

  it('starts a round and records edu_page_play_demo_started', () => {
    render(<EslPlayableDemo locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start the round' }));
    expect(mockTrack).toHaveBeenCalledWith('edu_page_play_demo_started', {
      cefr: 'A1',
      page: '/education/esl-word-games',
    });
    expect(screen.getAllByRole('button', { name: /^[A-Z]$/ }).length).toBe(16);
  });

  it('fires esl_list_used when a CEFR list is chosen', () => {
    render(<EslPlayableDemo locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'A2' }));
    expect(mockTrack).toHaveBeenCalledWith('esl_list_used', {
      cefr: 'A2',
      page: '/education/esl-word-games',
    });
  });

  it('accepts CAT on the A1 board and lists it as found', () => {
    render(<EslPlayableDemo locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start the round' }));
    const tiles = screen.getAllByRole('button', { name: /^[A-Z]$/ });
    fireEvent.click(tiles[0]);
    fireEvent.click(tiles[1]);
    fireEvent.click(tiles[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Submit word' }));
    expect(screen.getByText('CAT')).toBeTruthy();
  });

  it('links the selected list into classroom practice', () => {
    render(<EslPlayableDemo locale="es" />);
    const link = screen.getByRole('link', { name: 'Usar esta lista con la clase' });
    expect(link).toHaveAttribute('href', '/es/education/classroom-game?cefr=A1');
  });

  it('sets RTL on Hebrew', () => {
    const { container } = render(<EslPlayableDemo locale="he" />);
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
  });

  it('renders Spanish glosses for es and English definitions elsewhere', () => {
    const { unmount } = render(<EslPlayableDemo locale="es" />);
    expect(screen.getByText('— el gato')).toBeTruthy();
    unmount();
    render(<EslPlayableDemo locale="en" />);
    expect(screen.getByText('— a small pet that says meow')).toBeTruthy();
  });

  it('runs a real 60-second clock and ends the round at zero', () => {
    vi.useFakeTimers();
    render(<EslPlayableDemo locale="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start the round' }));
    expect(screen.getByTestId('esl-demo-clock').textContent).toContain('1:00');
    // The clock re-arms one timeout per tick, so advance a second at a time
    // to let each decrement render and schedule the next.
    for (let i = 0; i < 60; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByText('Time! Round over — nice work.')).toBeTruthy();
    // The board is gone; Play again restarts a fresh round.
    expect(screen.queryAllByRole('button', { name: /^[A-Z]$/ }).length).toBe(0);
    expect(mockTrack).toHaveBeenCalledWith('edu_page_play_demo_completed', {
      cefr: 'A1',
      found: 0,
      page: '/education/esl-word-games',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByTestId('esl-demo-clock').textContent).toContain('1:00');
  });
});
