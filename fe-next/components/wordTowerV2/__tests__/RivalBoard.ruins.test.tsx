import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RivalBoard } from '../rivals/RivalBoard';

vi.mock('@/components/Avatar', () => ({ default: () => null }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: null, user: { id: 'me' } }) }));

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const tower = [{ word: 'tower', w: 200, x: 0, y: -60, angle: 0, color: 0xff00ff }];
const mk = (id: string, ruins?: { count: number; by: string[]; byYou: boolean }) => ({
  userId: id,
  displayName: `P-${id}`,
  avatar: { avatarConfig: null, avatarEmoji: null, avatarColor: null, avatarImage: null },
  district: 1,
  plots: [],
  shields: 0,
  bestM: 20,
  lastTower: tower,
  ruins,
});

function estate(rivals: ReturnType<typeof mk>[]) {
  return {
    status: 'ready',
    authed: true,
    rivals: () => Promise.resolve({ rivals, revenge: [] }),
  } as never;
}

describe('RivalBoard — ruins are visible on the tower', () => {
  it('shows who ruined a tower, and that it was you', async () => {
    render(
      <RivalBoard
        t={t}
        myTower={tower}
        myHeightM={10}
        onPick={() => {}}
        estate={estate([
          mk('a', { count: 2, by: ['Dana'], byYou: false }),
          mk('b', { count: 1, by: [], byYou: true }),
          mk('c'),
        ])}
      />,
    );
    expect(await screen.findByText('wordTowerV2.dailyTower.ruinedBy:{"names":"Dana"}')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.dailyTower.ruinedByYou')).toBeTruthy();
    expect(document.querySelectorAll('[data-wt2-ruin]')).toHaveLength(2);
  });
});
