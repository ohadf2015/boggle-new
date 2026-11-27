import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const sounds = { playBoardShuffleSound: vi.fn(), playChestOpenSound: vi.fn(), playGiftReceivedSound: vi.fn() };
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sounds }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));

import MysteryGift from '../MysteryGift';

const base = { holiday: 'hanukkah' as const, tier: 5, openable: false, opened: null, finale: '2026-12-11', stalled: false };

describe('MysteryGift', () => {
  beforeEach(() => Object.values(sounds).forEach((s) => s.mockReset()));

  it('Given 5 lit nights before the finale, then the tier-5 box shows with its opening day', () => {
    render(<MysteryGift {...base} onOpen={vi.fn()} />);
    expect(screen.getByTestId('mystery-gift-img').getAttribute('src')).toBe('/holidays/gift-tier-5.webp');
    expect(screen.getByText(/holiday\.gift\.opensOn/)).toBeInTheDocument();
  });

  it('Given a locked box, when tapped twice, then it shakes, rattles and rotates its hint without opening', () => {
    const onOpen = vi.fn();
    render(<MysteryGift {...base} onOpen={onOpen} />);
    const box = screen.getByRole('button', { name: /holiday\.gift\.shakeLabel/ });
    fireEvent.click(box);
    expect(box.className).toContain('holiday-gift-shake');
    expect(screen.getByText('holiday.gift.hanukkah.hint.0')).toBeInTheDocument();
    fireEvent.click(box);
    expect(screen.getByText('holiday.gift.hanukkah.hint.1')).toBeInTheDocument();
    expect(sounds.playBoardShuffleSound).toHaveBeenCalledTimes(2);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('Given a missed day, then the box says it stalled instead of shrinking', () => {
    render(<MysteryGift {...base} stalled onOpen={vi.fn()} />);
    expect(screen.getByText('holiday.gift.stalled')).toBeInTheDocument();
  });

  it('Given the finale, when opened, then the reward is revealed with sound', async () => {
    const onOpen = vi.fn().mockResolvedValue({ coins: 520, partKey: 'accessory:goldGeltMedal' });
    render(<MysteryGift {...base} tier={8} openable onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'holiday.gift.openCta' }));
    await waitFor(() => expect(screen.getByTestId('mystery-gift-reward')).toBeInTheDocument());
    expect(screen.getByTestId('mystery-gift-reward').textContent).toContain('holiday.part.goldGeltMedal');
    expect(sounds.playChestOpenSound).toHaveBeenCalled();
  });

  it('Given the open fails, then the box stays closed with a retry message', async () => {
    const onOpen = vi.fn().mockResolvedValue(null);
    render(<MysteryGift {...base} tier={8} openable onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'holiday.gift.openCta' }));
    await waitFor(() => expect(screen.getByText('holiday.gift.openError')).toBeInTheDocument());
    expect(screen.queryByTestId('mystery-gift-reward')).toBeNull();
  });

  it('Given it was opened before, then the reward shows without a second open', () => {
    render(<MysteryGift {...base} openable opened={{ coins: 120 }} onOpen={vi.fn()} />);
    expect(screen.getByTestId('mystery-gift-reward').textContent).toContain('holiday.reward.coins');
    expect(screen.queryByRole('button', { name: /holiday\.gift\.open/ })).toBeNull();
  });
});
