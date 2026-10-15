import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

let pathname = '/en';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/components/GlobalBottomNav', () => ({ default: () => <nav data-testid="player-bottom-nav" /> }));

import { PlayerBottomNav } from '../PlayerBottomNav';

describe('PlayerBottomNav', () => {
  it.each(['/en/pricing', '/he/pricing', '/en/education/live', '/en/education/classroom-game', '/en/teacher', '/en/join'])(
    'keeps the player tabs off the classroom surface %s',
    (path) => {
      pathname = path;
      render(<PlayerBottomNav />);
      expect(screen.queryByTestId('player-bottom-nav')).toBeNull();
    },
  );

  it.each(['/en', '/en/daily', '/en/education/esl-word-games'])('shows the player tabs on %s', (path) => {
    pathname = path;
    render(<PlayerBottomNav />);
    expect(screen.getByTestId('player-bottom-nav')).toBeInTheDocument();
  });
});
