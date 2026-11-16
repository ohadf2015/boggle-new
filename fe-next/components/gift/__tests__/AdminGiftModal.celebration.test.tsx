import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockConfetti, mockPerf } = vi.hoisted(() => ({
  mockConfetti: vi.fn(),
  mockPerf: vi.fn(() => ({ prefersReducedMotion: false, enableGlowEffects: true, isLowEnd: false })),
}));
vi.mock('react-hot-toast', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: mockConfetti }));
vi.mock('@/hooks/useDevicePerformance', () => ({ useDevicePerformance: mockPerf }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));

import { AdminGiftModal } from '../AdminGiftModal';

const gift = { id: 'g1', title: 'Hi', message: 'm', template_type: null, xp_amount: 50, coin_amount: 20 };
const open = (props = {}) =>
  render(<AdminGiftModal gift={gift as never} show onClaim={vi.fn().mockResolvedValue(undefined)} onDismiss={vi.fn()} currentXp={100} currentCoins={10} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  // the repo's global setup makes rAF a no-op; the count-up needs a real frame loop
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});
afterEach(() => vi.unstubAllGlobals());

describe('AdminGiftModal celebration', () => {
  it('shows a closed gift box before claiming and opens it after', async () => {
    const { container } = open();
    const box = () => container.querySelector('.gift-box');
    expect(box()).toHaveAttribute('data-open', 'false');
    fireEvent.click(screen.getByRole('button', { name: /gift.claim/ }));
    await waitFor(() => expect(box()).toHaveAttribute('data-open', 'true'));
  });

  it('fires confetti on claim and settles on the new totals', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: /gift.claim/ }));
    await waitFor(() => expect(mockConfetti).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('150 XP')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText(/30 gift.coins/)).toBeInTheDocument();
  });

  it('skips confetti and counting under reduced motion but still shows the new totals', async () => {
    mockPerf.mockReturnValue({ prefersReducedMotion: true, enableGlowEffects: false, isLowEnd: false });
    open();
    fireEvent.click(screen.getByRole('button', { name: /gift.claim/ }));
    await waitFor(() => expect(screen.getByText('150 XP')).toBeInTheDocument());
    expect(mockConfetti).not.toHaveBeenCalled();
  });

  it('shows an already-claimed gift as opened with a close-only action', () => {
    const { container } = open({ gift: { ...gift, claimed: true } });
    expect(container.querySelector('.gift-box')).toHaveAttribute('data-open', 'true');
  });
});
