import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockToastError } = vi.hoisted(() => ({ mockToastError: vi.fn() }));
vi.mock('react-hot-toast', () => ({ toast: { error: mockToastError } }));
vi.mock('gsap', () => ({
  timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), kill: vi.fn() })),
  context: vi.fn((cb: () => void) => { cb(); return { revert: vi.fn() }; }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ prefersReducedMotion: true, enableGlowEffects: false, isLowEnd: false }),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));

import { AdminGiftModal } from '../AdminGiftModal';

const gift = { id: 'g1', title: 'Hi', message: 'm', template_type: null, xp_amount: 5, coin_amount: 5 };

describe('AdminGiftModal claim failure', () => {
  it('tells the player the claim failed and lets them try again', async () => {
    const onClaim = vi.fn().mockRejectedValue(new Error('Cannot claim gift'));
    render(<AdminGiftModal gift={gift as never} show onClaim={onClaim} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /gift.claim/ }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('gift.claimError'));
    await waitFor(() => expect(screen.getByRole('button', { name: /gift.claim/ })).toBeEnabled());
  });
});
