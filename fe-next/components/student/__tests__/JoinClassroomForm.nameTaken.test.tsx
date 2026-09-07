import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * A duplicate nickname must be a one-tap fix, not a dead form.
 *
 * Live: a guest typing "priya" into a class that already had a "Priya" got a
 * Supabase 500 ("Database error creating anonymous user") and the form sat
 * there. Real classes have two Priyas, so this is not an edge case.
 *
 * The collision is now caught server-side before the anonymous user is minted,
 * and comes back as NAME_TAKEN plus a name that is genuinely free. The student
 * should never have to invent one themselves, and must never be shown a generic
 * "something went wrong" for a problem they can fix in a tap.
 */
const { mockJoin, mockPreview, mockUseAuth, mockPush, mockToastError } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockPreview: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
  mockToastError: vi.fn(),
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
vi.mock('@/hooks/useClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: mockToastError } }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...p }: Record<string, unknown>) => React.createElement('div', p as never, children as React.ReactNode) }),
}));
vi.mock('@/lib/education/classroomPreview', () => ({ lookupClassroomPreview: mockPreview }));

import JoinClassroomForm from '../JoinClassroomForm';

const nameInput = () => screen.getByLabelText('education.student.join.nameLabel');
const joinButton = () => screen.getByRole('button', { name: /education\.student\.join\.button/i });

async function submitAs(name: string) {
  render(<JoinClassroomForm initialCode="P45KRT" />);
  fireEvent.change(nameInput(), { target: { value: name } });
  fireEvent.click(joinButton());
}

describe('JoinClassroomForm — duplicate nickname', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockPreview.mockResolvedValue({ id: 'class-1', name: 'Flow Check', kind: 'classroom' });
    mockJoin.mockResolvedValue({
      success: false,
      code: 'NAME_TAKEN',
      suggestedName: 'Priya 2',
      error: 'NAME_TAKEN',
    });
  });

  it('explains the clash and names a free alternative', async () => {
    // GIVEN a class that already has a Priya
    await submitAs('priya');

    // THEN the student is told what happened, with the working name in the copy
    // The working name is interpolated into the message itself, so the student
    // reads it before deciding. (The button repeats it, hence the scoped match.)
    const message = await screen.findByText(/education\.student\.join\.nameTaken/);
    expect(message).toHaveTextContent('"suggestedName":"Priya 2"');

    // AND is NOT shown the generic failure that told them nothing
    expect(mockToastError).not.toHaveBeenCalledWith('common.error');
  });

  it('offers a one-tap button that takes the suggested name', async () => {
    // GIVEN the clash has been reported
    await submitAs('priya');
    const useSuggested = await screen.findByRole('button', {
      name: /education\.student\.join\.useSuggestedName/,
    });

    // WHEN the student taps it
    mockJoin.mockResolvedValue({ success: true, classroomId: 'class-1' });
    fireEvent.click(useSuggested);

    // THEN the join is retried under the free name, without them typing anything
    await waitFor(() =>
      expect(mockJoin).toHaveBeenLastCalledWith('P45KRT', { guestName: 'Priya 2' })
    );
  });

  it('puts the suggested name in the field so it can be edited instead', async () => {
    // GIVEN the clash, and a student who would rather be "Priya B"
    await submitAs('priya');
    fireEvent.click(
      await screen.findByRole('button', { name: /education\.student\.join\.useSuggestedName/ })
    );

    // THEN the field holds the accepted name rather than their old one, so the
    // next edit starts from something that works
    await waitFor(() => expect(nameInput()).toHaveValue('Priya 2'));
  });

  it('clears the clash once the student edits the name themselves', async () => {
    // GIVEN the clash is on screen
    await submitAs('priya');
    await screen.findByText(/education\.student\.join\.nameTaken/);

    // WHEN they type a different name
    fireEvent.change(nameInput(), { target: { value: 'Priya K' } });

    // THEN the stale suggestion goes away rather than lingering over a name it
    // was never about
    expect(screen.queryByText(/education\.student\.join\.nameTaken/)).not.toBeInTheDocument();
  });

  it('still reports other failures normally', async () => {
    // GIVEN an unrelated failure
    mockJoin.mockResolvedValue({ success: false, code: 'INVALID_CODE' });
    await submitAs('Priya');

    // THEN no name suggestion is invented for a problem that is not about names
    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(screen.queryByText(/education\.student\.join\.nameTaken/)).not.toBeInTheDocument();
  });
});
