import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProWelcomeCelebration } from '../ProWelcomeCelebration';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k), language: 'en' }),
}));
const fireConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: (...a: unknown[]) => fireConfetti(...a) }));

/**
 * The paid twin of the gifted celebration. A teacher coming back from Polar
 * checkout (`/teacher?checkout=success`) must SEE that the payment took and
 * learn where to manage or cancel it — the gifted copy ("no card, ends on
 * {date}") would be a lie for her.
 */
describe('ProWelcomeCelebration — paid checkout', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    fireConfetti.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }) as unknown as typeof fetch;
    window.history.replaceState(null, '', '/en/teacher?checkout=success');
  });
  afterEach(() => { global.fetch = originalFetch; });

  it('celebrates a paid subscription with paid copy and a link to manage it', () => {
    render(<ProWelcomeCelebration grant={null} paid />);
    expect(screen.getByRole('dialog', { name: 'teacher.proWelcome.title' })).toBeInTheDocument();
    expect(screen.getByText('teacher.proWelcome.paidBody')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'teacher.proWelcome.manage' })).toHaveAttribute('href', '/en/teacher/profile');
    // gifted-only copy must not leak onto a paying teacher
    expect(screen.queryByText(/teacher\.proWelcome\.until/)).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.proWelcome.noCard')).not.toBeInTheDocument();
    expect(fireConfetti).toHaveBeenCalled();
  });

  it('does not write the gift seen-marker for a paid celebration', () => {
    render(<ProWelcomeCelebration grant={null} paid />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('strips ?checkout=success on close so a reload does not re-celebrate', () => {
    render(<ProWelcomeCelebration grant={null} paid />);
    fireEvent.click(screen.getByRole('button', { name: 'teacher.proWelcome.cta' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.location.search).not.toContain('checkout');
  });

  it('stays hidden without the paid flag or a grant', () => {
    render(<ProWelcomeCelebration grant={null} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
