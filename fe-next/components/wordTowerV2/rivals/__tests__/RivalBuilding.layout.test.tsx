import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { RivalBuilding } from '../RivalBuilding';

vi.mock('@/components/Avatar', () => ({ default: () => null }));

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

const rival = {
  userId: 'u2',
  displayName: 'Joker',
  avatar: { avatarConfig: null, avatarEmoji: null, avatarColor: null, avatarImage: null },
  district: 3,
  plots: [],
  shields: 2,
  bestM: 53,
  lastTower: [
    { word: 'שמה', w: 200, x: 0, y: -60, angle: 0, color: 0x22e1ff },
    { word: 'רמו', w: 180, x: 0, y: -180, angle: 0, color: 0xff2e88 },
  ],
};

const base = {
  t,
  rival,
  revenge: true,
  charges: 0,
  busy: false,
  onWreck: vi.fn(),
  onClose: vi.fn(),
  grievance: { blocked: true, coinsStolen: 0, plot: 'foundation' },
};

describe('RivalBuilding layout', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('keeps the close button in the header, clear of the payback banner and the mute corner', () => {
    const { container } = render(<RivalBuilding {...base} />);
    const close = screen.getByTestId('rival-building-close');
    const banner = screen.getByTestId('rival-building-banner');
    const header = container.querySelector('header');
    expect(header).toBeTruthy();
    expect(header).toContainElement(close);
    expect(header).toContainElement(banner);
    expect(close.className).not.toMatch(/\babsolute\b/);
    expect(close.className).toMatch(/shrink-0/);
  });

  it('states a single goal, a first-time coach tip, and the aimed floor', () => {
    render(<RivalBuilding {...base} />);
    expect(screen.getByTestId('rival-building-goal').textContent).toContain('wordTowerV2.rivals.goalRevengeBlocked');
    expect(screen.getByTestId('rival-coach').textContent).toContain('wordTowerV2.rivals.coachTip');
    expect(screen.getByText(/aimChip.*"word":"רמו"/)).toBeTruthy();
    expect(screen.getByText(/shieldsN.*"n":2/)).toBeTruthy();
    expect(screen.getByTestId('rival-building-cta').textContent).toContain('revengeName');
  });

  it('dismisses the coach tip and keeps it dismissed', () => {
    const { rerender } = render(<RivalBuilding {...base} />);
    fireEvent.click(screen.getByText('wordTowerV2.rivals.coachGotIt'));
    expect(screen.queryByTestId('rival-coach')).toBeNull();
    rerender(<RivalBuilding {...base} />);
    expect(screen.queryByTestId('rival-coach')).toBeNull();
  });

  it('updates the aim chip when a lower floor is picked', () => {
    render(<RivalBuilding {...base} />);
    fireEvent.click(screen.getByRole('button', { name: 'wordTowerV2.rivals.aimAt:{"word":"שמה"}' }));
    expect(screen.getByText(/aimChip.*"word":"שמה"/)).toBeTruthy();
    expect(screen.getByTestId('tower-floor-0')).toHaveAttribute('data-selected', 'true');
  });

  it('uses the raid goal when this is not payback', () => {
    render(<RivalBuilding {...base} revenge={false} charges={1} grievance={undefined} />);
    expect(screen.getByTestId('rival-building-goal').textContent).toContain('wordTowerV2.rivals.goalRaid');
    expect(screen.queryByTestId('rival-building-banner')).toBeNull();
  });
});
