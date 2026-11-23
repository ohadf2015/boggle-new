import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const nav = { pathname: '/en/teacher' };
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { display_name: 'Tester' } }),
}));
const mockFetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (...a: unknown[]) => mockFetchWithAuth(...a) }));
vi.mock('@/components/engagement/ComebackBonusModal', () => ({
  ComebackBonusModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="comeback-modal" /> : null),
}));

import ComebackBonusWrapper from '../ComebackBonusWrapper';

describe('ComebackBonusWrapper on teacher screens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockFetchWithAuth.mockResolvedValue({ ok: true, json: async () => ({ eligible: true, tier: 'gold', daysAway: 3 }) });
  });

  it('does not cover the teacher dashboard with a player XP bonus', async () => {
    nav.pathname = '/en/teacher';
    render(<ComebackBonusWrapper />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('comeback-modal')).not.toBeInTheDocument();
    expect(mockFetchWithAuth).not.toHaveBeenCalled();
  });

  it('still welcomes a returning player on a game screen', async () => {
    nav.pathname = '/en';
    render(<ComebackBonusWrapper />);
    await waitFor(() => expect(screen.getByTestId('comeback-modal')).toBeInTheDocument());
  });
});
