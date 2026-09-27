import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * `/[locale]/join/[code]` — where the projector's QR code lands.
 *
 * Two bugs are buried in this route's history and both must stay dead:
 *
 *  1. It bounced every logged-out student to the homepage and demanded a
 *     signup, in front of the one action the link exists for. Guests join.
 *  2. It rendered a full-page loader until auth resolved. That is a spinner
 *     between a phone camera and a nickname field — the exact wait this
 *     redesign removes. `JoinFlow` renders immediately and holds an early tap
 *     itself, so there is nothing to gate on here.
 *
 * Nothing on this page may ever call `router.push`; the flow owns navigation.
 */
const { mockPush, mockUseAuth } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ code: '4HCDMS' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/components/education/join/JoinFlow', () => ({
  default: ({ initialCode }: { initialCode?: string }) => (
    <div data-testid="join-flow">{initialCode}</div>
  ),
}));

import JoinWithCodePageClient from '../PageClient';

describe('<JoinWithCodePageClient>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAuthenticated: false });
  });

  it('hands the URL code to the flow', () => {
    render(<JoinWithCodePageClient />);
    expect(screen.getByTestId('join-flow')).toHaveTextContent('4HCDMS');
  });

  it('shows the flow to a logged-out student instead of bouncing them', () => {
    render(<JoinWithCodePageClient />);
    expect(screen.getByTestId('join-flow')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows the flow — not a loader — while the session is still resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, isAuthenticated: false });
    render(<JoinWithCodePageClient />);
    expect(screen.getByTestId('join-flow')).toBeInTheDocument();
    expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not redirect a signed-in student either', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123' },
      loading: false,
      isAuthenticated: true,
    });
    render(<JoinWithCodePageClient />);
    expect(screen.getByTestId('join-flow')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
