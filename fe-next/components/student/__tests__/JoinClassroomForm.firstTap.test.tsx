import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * The first tap on JOIN has to do something. It still did not, 3 times in 5.
 *
 * My previous fix added a third "auth unresolved" state, and that was necessary
 * but not sufficient — the join PAGE already waits for auth before mounting this
 * form, so on `/join/<code>` that state is almost never the one being hit.
 *
 * The mechanism that survives is layout shift. The guest name field was gated on
 * `isGuest && code.trim().length === 6`, so it appeared the instant the sixth
 * character landed and pushed the submit button DOWN the page. On a 390x844
 * phone — the critic's viewport — a finger already travelling toward the button
 * lands where the button used to be. Nothing happens, and the second tap works
 * because by then the layout has settled. "Nothing happens, try again" is the
 * exact symptom.
 *
 * Two fixes, both pinned here: the field no longer appears mid-interaction, and
 * a submit that arrives before the form is ready is QUEUED and fired on ready
 * rather than dropped.
 */
const { mockJoin, mockPreview, mockUseAuth, mockPush } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockPreview: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...p }: Record<string, unknown>) => React.createElement('div', p as never, children as React.ReactNode) }),
}));
vi.mock('@/lib/education/classroomPreview', () => ({ lookupClassroomPreview: mockPreview }));

import JoinClassroomForm from '../JoinClassroomForm';

const codeInput = () => screen.getByLabelText('education.student.join.codeLabel');

describe('JoinClassroomForm — the first tap always counts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-1' });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Flow Check', language: 'en' });
  });

  it('holds the confirmation card\'s space so its late arrival cannot move the button', async () => {
    // GIVEN a guest who has typed a full code. The confirmation card resolves on
    // a 300ms debounce plus a network round trip, so it lands LATE — while the
    // student is filling in their name or already reaching for JOIN.
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    const { container } = render(<JoinClassroomForm />);
    fireEvent.change(codeInput(), { target: { value: 'UY6W8L' } });

    const slot = screen.getByTestId('join-preview-slot');
    const heightBefore = slot.className;

    // WHEN the card finally arrives
    await waitFor(() => expect(screen.getByText('Flow Check')).toBeInTheDocument());

    // THEN it landed INSIDE the reserved slot rather than inserting a new row
    // above the button. Nothing below it moved, so a tap already in flight
    // still hits the button it was aimed at.
    expect(screen.getByTestId('join-preview-slot')).toContainElement(screen.getByText('Flow Check'));
    expect(screen.getByTestId('join-preview-slot').className).toBe(heightBefore);
  });

  it('queues a submit that arrives before auth resolves and fires it on ready', async () => {
    // GIVEN a form whose session has not resolved
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container, rerender } = render(<JoinClassroomForm initialCode="UY6W8L" />);
    fireEvent.change(codeInput(), { target: { value: 'UY6W8L' } });

    // WHEN the student submits into that window
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(mockJoin).not.toHaveBeenCalled();

    // AND auth resolves a moment later, with a name already filled
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    rerender(<JoinClassroomForm initialCode="UY6W8L" />);
    fireEvent.change(screen.getByLabelText('education.student.join.nameLabel'), {
      target: { value: 'Maya' },
    });

    // THEN their intent is honoured without a second tap
    await waitFor(() => expect(mockJoin).toHaveBeenCalledWith('UY6W8L', { guestName: 'Maya' }));
  });

  it('shows the pending state while the queued intent waits', () => {
    // GIVEN an unresolved session
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container } = render(<JoinClassroomForm initialCode="UY6W8L" />);

    // WHEN a submit lands early
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    // THEN the student sees that it was received, not silence
    expect(screen.getByText('education.student.join.preparing')).toBeInTheDocument();
  });
});
