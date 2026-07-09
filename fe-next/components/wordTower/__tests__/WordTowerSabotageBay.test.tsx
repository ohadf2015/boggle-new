import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordTowerSabotageBay } from '../WordTowerSabotageBay';
import type { RivalMarker } from '@/lib/wordTower/rivals';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const rivals: RivalMarker[] = [
  {
    id: 'r1',
    name: 'Alex',
    heightM: 120,
    playerId: 'p-alex',
    avatarEmoji: '🧗', // legacy field must NEVER render as the face
  },
  {
    id: 'r2',
    name: 'Bo',
    heightM: 80,
    playerId: 'p-bo',
  },
];

const base = {
  tokens: 2,
  rivals,
  pickerOpen: true,
  onOpen: vi.fn(),
  onClose: vi.fn(),
  onSend: vi.fn(),
  attackerHeightM: 100,
  lastHit: null,
  onDismissHit: vi.fn(),
  earnedToast: null as number | null,
  onDismissEarned: vi.fn(),
  t,
  reducedMotion: true,
};

describe('WordTowerSabotageBay — real avatars only', () => {
  it('renders shared Avatar faces in the rival picker, never emoji glyphs', () => {
    render(<WordTowerSabotageBay {...base} />);
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Bo')).toBeInTheDocument();
    // Avatar seeds from playerId/id — never the 🧗 fallback face.
    expect(screen.getAllByTestId('header-avatar').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('🧗')).not.toBeInTheDocument();
  });

  it('shows a high-impact ready chip when the player has wrecking-ball tokens', () => {
    render(<WordTowerSabotageBay {...base} pickerOpen={false} />);
    const chip = screen.getByRole('button', { name: /wordTower\.sabotage\.chip/i });
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute('data-wreck-ready', 'true');
    expect(screen.getByTestId('wt-wreck-ball-icon')).toBeInTheDocument();
  });

  it('hides the chip when tokens are zero (earn path only)', () => {
    render(<WordTowerSabotageBay {...base} tokens={0} pickerOpen={false} />);
    expect(screen.queryByRole('button', { name: /wordTower\.sabotage\.chip/i })).not.toBeInTheDocument();
  });

  it('opens smash on rival pick without rendering emoji faces', () => {
    render(<WordTowerSabotageBay {...base} />);
    fireEvent.click(screen.getByText('Alex'));
    // Picker closes; smash mounts. Avatar must still appear on smash header.
    expect(screen.queryByText('🧗')).not.toBeInTheDocument();
  });
});
