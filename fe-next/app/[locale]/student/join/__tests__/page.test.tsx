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

  it('dresses the shared flow in the Academy arena art, behind the code field', () => {
    const { container } = render(<StudentJoinPageClient />);
    const backdrop = screen.getByTestId('student-join-backdrop');
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    // Never intercepts a tap meant for the code boxes.
    expect(backdrop.className).toContain('pointer-events-none');
    expect(container.querySelector('img[src*="arena-lobby-bg"]')).not.toBeNull();
  });

  it("stretches the flow's fixed 390x844 confetti anchor to the viewport width", () => {
    const { container } = render(<StudentJoinPageClient />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('[&>[data-testid=bounded-confetti-anchor]]:!w-full');
    expect(wrapper.className).toContain('[&>[data-testid=bounded-confetti-anchor]]:!h-auto');
    // The flow's own navy is cleared so the arena shows through it.
    expect(wrapper.className).toContain('[&>[data-testid=bounded-confetti-anchor]>div]:!bg-transparent');
  });

  it('paints the backdrop BEFORE the flow, so the flow and its confetti sit above it', () => {
    render(<StudentJoinPageClient />);
    const backdrop = screen.getByTestId('student-join-backdrop');
    const flow = screen.getByTestId('join-flow');
    expect(backdrop.compareDocumentPosition(flow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(backdrop.className).not.toMatch(/(^|\s)z-/);
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
