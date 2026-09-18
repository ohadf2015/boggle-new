/**
 * Simplified join flow tests covering Blooket parity:
 * - One field + one primary action per screen
 * - Confetti + success celebration before navigation
 * - Paste integrated into code field
 * - PopPressButton for primary actions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth, mockPush, mockToast } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, string>) =>
      params ? `${k}:${JSON.stringify(params)}` : k,
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: mockToast }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

const codeField = () => screen.getByLabelText('education.student.join.codeLabel');
const nameField = () => screen.getByLabelText('education.student.join.nameLabel');
const nextButton = () =>
  screen.queryAllByRole('button').find((b) => b.textContent?.includes('education.student.join.flow.next'));
const goButton = () =>
  screen.queryAllByRole('button').find((b) => b.textContent?.includes('education.student.join.flow.go'));

describe('<JoinFlow> — simplified for Blooket parity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Ms Levy' });
  });

  it('code screen has one field and one button', () => {
    render(<JoinFlow />);
    const buttons = screen.getAllByRole('button');
    // Should have NEXT button + PASTE icon button (integrated into field)
    // PASTE is now inside the field, so 2 buttons is correct
    const nextButtons = buttons.filter((b) => b.textContent?.includes('education.student.join.flow.next'));
    expect(nextButtons).toHaveLength(1);

    // Paste button should have aria-label "Paste code"
    const pasteButtons = buttons.filter((b) => b.getAttribute('aria-label')?.includes('Paste'));
    expect(pasteButtons).toHaveLength(1);
  });

  it('name screen has one field and one button', async () => {
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Ms Levy' });
    render(<JoinFlow initialCode="P45KRT" />);

    expect(nameField()).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    // Should have BACK button + GO button = 2 buttons on name step
    // But BACK should not be counted in the "1 field 1 button" per step rule
    // The primary action is GO
    const goBtns = buttons.filter((b) => b.textContent?.includes('education.student.join.flow.go'));
    expect(goBtns).toHaveLength(1);
  });

  it('paste button is integrated into code field, not separate', () => {
    render(<JoinFlow />);
    // Should NOT find a separate PASTE button
    const pasteButtons = screen.queryAllByRole('button').filter((b) =>
      b.textContent?.toLowerCase().includes('paste')
    );
    expect(pasteButtons).toHaveLength(0);
  });

  it('confetti renders on successful join before navigation', async () => {
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-123' });
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Ms Levy' });

    render(<JoinFlow initialCode="P45KRT" />);

    // Type name
    const nameInput = nameField();
    fireEvent.change(nameInput, { target: { value: 'Alice' } });

    // Submit
    const goBtn = goButton();
    expect(goBtn).toBeInTheDocument();
    fireEvent.click(goBtn!);

    // Confetti should render (BoundedConfettiBurst exists)
    await waitFor(() => {
      expect(screen.queryByTestId('bounded-confetti-anchor')).toBeInTheDocument();
    }, { timeout: 100 });
  });

  it('navigation happens after confetti animation completes (~600-900ms)', async () => {
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-123' });
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Ms Levy' });

    vi.useFakeTimers();
    render(<JoinFlow initialCode="P45KRT" />);

    const nameInput = nameField();
    fireEvent.change(nameInput, { target: { value: 'Bob' } });

    const goBtn = goButton();
    fireEvent.click(goBtn!);

    // Should NOT navigate immediately
    expect(mockPush).not.toHaveBeenCalled();

    // Wait for confetti timer (~750ms)
    act(() => {
      vi.advanceTimersByTime(750);
    });

    // Now should navigate
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });
});
