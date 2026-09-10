// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EslPlayableDemo } from '../EslPlayableDemo';

const mockTrack = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrack(...args),
}));

describe('EslPlayableDemo', () => {
  beforeEach(() => mockTrack.mockClear());

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
    expect(link).toHaveAttribute('href', '/es/education/classroom-game?cefr=A1&mode=warmup');
  });

  it('sets RTL on Hebrew', () => {
    const { container } = render(<EslPlayableDemo locale="he" />);
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
  });
});
