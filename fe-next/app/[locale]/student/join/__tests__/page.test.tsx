import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * `/[locale]/student/join` — the in-app door.
 *
 * It must render the SAME `JoinFlow` as `/join` and `/join/[code]`. Three
 * doors onto one job is how two of them quietly drift apart (recurring
 * pitfall class 3), and this one is the door a student uses after a failed
 * attempt, so it has to behave identically to the one they came in through.
 *
 * It also must never redirect (the old bug: logged-out students bounced to
 * the landing page) and never gate on auth (the old spinner).
 */
const { mockPush, mockUseAuth } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/components/education/join/JoinFlow', () => ({
  default: ({ initialCode }: { initialCode?: string }) => (
    <div data-testid="join-flow">{initialCode ?? ''}</div>
  ),
}));

import StudentJoinPageClient from '../PageClient';

describe('<StudentJoinPageClient>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAuthenticated: false });
  });

  it('renders the shared join flow with no code pre-filled', () => {
    render(<StudentJoinPageClient />);
    expect(screen.getByTestId('join-flow')).toBeInTheDocument();
    expect(screen.getByTestId('join-flow')).toHaveTextContent('');
  });

  it('shows the flow — not a loader — while the session is still resolving', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, isAuthenticated: false });
    render(<StudentJoinPageClient />);
    expect(screen.getByTestId('join-flow')).toBeInTheDocument();
    expect(screen.queryByText('common.loading')).not.toBeInTheDocument();
  });

  it('never redirects a logged-out student away from the join screen', () => {
    render(<StudentJoinPageClient />);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('never redirects a signed-in student either', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1' },
      loading: false,
      isAuthenticated: true,
    });
    render(<StudentJoinPageClient />);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
