import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProWelcomeCelebration } from '../ProWelcomeCelebration';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k), language: 'en' }),
}));
const fireConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: (...a: unknown[]) => fireConfetti(...a) }));

const grant = { id: 'g1', expires_at: '2027-09-05T12:00:00Z', days: 365, note: 'Sorry about Thursday.', welcomed: false };

/**
 * One-time "you are on Pro" moment for a gifted teacher. The seen-marker is
 * written the moment it RENDERS (pitfall class 1: persist at show-time, never
 * at dismiss-time), and it never shows again once `welcomed` is true.
 */
describe('ProWelcomeCelebration', () => {
  const originalFetch = global.fetch;
  beforeEach(() => { fireConfetti.mockClear(); global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }) as unknown as typeof fetch; });
  afterEach(() => { global.fetch = originalFetch; });

  it('shows for an unwelcomed grant, fires confetti, and marks itself seen immediately', async () => {
    render(<ProWelcomeCelebration grant={grant} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Sorry about Thursday.')).toBeInTheDocument();
    expect(screen.getByText(/teacher.proWelcome.until:/)).toHaveTextContent('2027');
    expect(fireConfetti).toHaveBeenCalled();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/subscription/pro-welcome-seen', expect.objectContaining({ method: 'POST' })));
  });

  it('does not show once welcomed', () => {
    render(<ProWelcomeCelebration grant={{ ...grant, welcomed: true }} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('closes on the primary button', () => {
    render(<ProWelcomeCelebration grant={grant} />);
    fireEvent.click(screen.getByRole('button', { name: 'teacher.proWelcome.cta' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
