import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/quick-play/QuickResultsFx', () => ({ QuickResultsRays: () => null, SparkleLoop: () => null }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, updateProfile: vi.fn(), refreshProfile: vi.fn() }),
}));
vi.mock('@/hooks/useAvatarPremium', () => ({ useAvatarPremium: () => null }));
vi.mock('next/dynamic', () => ({
  default: () =>
    function BuilderStub({ isOpen }: { isOpen: boolean }) {
      return isOpen ? <div role="dialog" data-testid="avatar-builder" /> : null;
    },
}));

import { PlayHero } from '../PlayHero';

const t = (key: string) => (key === 'profile.showcase.editAvatar' ? 'Edit avatar' : key);

function renderHero(overrides: Partial<React.ComponentProps<typeof PlayHero>> = {}) {
  return render(
    <PlayHero
      lang="en"
      t={t}
      animate={false}
      avatar={{ userId: 'guest', customAvatar: null }}
      greeting="Hey there"
      streak={0}
      streakLoading={false}
      onAvatarSaved={vi.fn()}
      {...overrides}
    />,
  );
}

describe('PlayHero', () => {
  it('given the hero, when tapping the edit-avatar button, then the real avatar builder opens', () => {
    renderHero();
    const edit = screen.getByRole('button', { name: 'Edit avatar' });
    expect(screen.queryByTestId('avatar-builder')).toBeNull();
    fireEvent.click(edit);
    expect(screen.getByTestId('avatar-builder')).toBeTruthy();
  });

  it('given the hero, then the mascot is decorative and hidden from assistive tech', () => {
    renderHero();
    const mascot = screen.getByTestId('hp-mascot');
    expect(mascot.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('given the hero, then Daily and Multiplayer entry points link to their routes', () => {
    renderHero({ lang: 'he' });
    const row = screen.getByTestId('hp-quick-links');
    const hrefs = Array.from(row.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/he/daily', '/he/multiplayer']);
  });

  it('given a running streak, then the daily chip shows it', () => {
    renderHero({ streak: 4 });
    expect(screen.getByTestId('hp-chip-daily').textContent).toContain('4-day streak');
  });

  it('given the streak is loading, then the daily chip shows no streak number yet', () => {
    renderHero({ streak: 4, streakLoading: true });
    expect(screen.getByTestId('hp-chip-daily').textContent).not.toContain('streak');
  });
});
