import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * The bar is Kahoot: a bored fifteen-year-old on a phone, holding nothing but
 * a code, is playing in under ten seconds.
 *
 * Everything asserted here is a way that promise has already been broken in
 * this product at least once:
 *   - a lookup standing between the student and their next keystroke,
 *   - a preview failure disabling the button on a perfectly good code,
 *   - a first tap that does nothing,
 *   - a duplicate nickname answered with "something went wrong",
 *   - a bad code and a server fault rendered as the same sentence,
 *   - an error that exists only as a toast, gone before it is read.
 */
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
vi.mock('@/hooks/useClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: mockToast }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

const codeField = () => screen.getByLabelText('education.student.join.codeLabel');
const nameField = () => screen.getByLabelText('education.student.join.nameLabel');
const goButton = () => screen.getByRole('button', { name: /education\.student\.join\.flow\.go/ });
const typeCode = (value: string) => fireEvent.change(codeField(), { target: { value } });
const onNameStep = () => screen.queryByLabelText('education.student.join.nameLabel') !== null;

/** A lookup that never answers — the slow school wifi case. */
const hangingLookup = () => new Promise<never>(() => {});

describe('<JoinFlow> — code step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy' });
  });

  it('moves on the SIXTH character without waiting for the code lookup', () => {
    // A student typing the last character must not be handed a network wait.
    mockResolve.mockImplementation(hangingLookup);
    render(<JoinFlow />);

    typeCode('P45KR');
    expect(onNameStep()).toBe(false);

    typeCode('P45KRT');
    // Synchronously — no findBy, no waitFor. The lookup is still in flight.
    expect(onNameStep()).toBe(true);
  });

  it('uppercases and strips whatever a student pastes out of a chat', () => {
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: ' p45-krt ' } });
    expect(onNameStep()).toBe(true);
    expect(screen.getByText('P45KRT')).toBeInTheDocument();
  });

  it('never accepts more than six characters', () => {
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'P45KRTXYZ' } });
    expect(screen.getByText('P45KRT')).toBeInTheDocument();
  });

  it('starts on the nickname step when the QR already carried the code', () => {
    render(<JoinFlow initialCode="P45KRT" />);
    expect(onNameStep()).toBe(true);
  });

  it('ignores a junk pre-filled code and asks for one instead of dead-ending', () => {
    render(<JoinFlow initialCode="AB1" />);
    expect(onNameStep()).toBe(false);
    expect(codeField()).toBeInTheDocument();
  });
});

describe('<JoinFlow> — the lookup decorates, it never gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('keeps GO alive while the lookup hangs', () => {
    mockResolve.mockImplementation(hangingLookup);
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: 'Maya' } });
    expect(goButton()).not.toBeDisabled();
  });

  it('keeps GO alive when the lookup fails outright', async () => {
    mockResolve.mockRejectedValue(new Error('rate limited'));
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: 'Maya' } });
    await waitFor(() => expect(mockResolve).toHaveBeenCalled());
    expect(goButton()).not.toBeDisabled();
  });

  it('keeps GO alive on an UNVERIFIED verdict — our outage is not their typo', async () => {
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: 'Maya' } });
    await waitFor(() => expect(mockResolve).toHaveBeenCalled());
    expect(goButton()).not.toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows whose room this is once the lookup lands', async () => {
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy' });
    render(<JoinFlow initialCode="P45KRT" />);
    expect(await screen.findByText('Ms Levy')).toBeInTheDocument();
  });
});

describe('<JoinFlow> — a code we are sure is wrong', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'invalid' });
  });

  it('says so INLINE, in the DOM, not only in a toast that vanishes', async () => {
    render(<JoinFlow initialCode="ZZZZZZ" />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('education.student.join.invalidCode');
  });

  it('offers a one-tap way back to the code without wiping what they typed', async () => {
    render(<JoinFlow initialCode="ZZZZZZ" />);
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: /education\.student\.join\.flow\.changeCode/ }));

    expect(onNameStep()).toBe(false);
    expect(codeField()).toHaveValue('ZZZZZZ');
  });

  it('does not yank the student off the nickname field on its own', async () => {
    render(<JoinFlow initialCode="ZZZZZZ" />);
    await screen.findByRole('alert');
    // Still on the name step: the verdict decorates, the student decides.
    expect(onNameStep()).toBe(true);
  });
});

describe('<JoinFlow> — submitting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy' });
  });

  const join = async (name = 'Maya') => {
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: name } });
    fireEvent.click(goButton());
  };

  it('walks a live-game joiner straight into the room', async () => {
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1', gameCode: 'P45KRT' });
    await join();
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=P45KRT&classroom=true')
    );
  });

  it('sends a roster joiner to the student hub', async () => {
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1' });
    await join();
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en/student'));
  });

  it('passes the guest nickname through', async () => {
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1' });
    await join('Maya');
    await waitFor(() =>
      expect(mockJoin).toHaveBeenCalledWith('P45KRT', { guestName: 'Maya' })
    );
  });

  it('answers an empty nickname with a reason, not a dead button', async () => {
    // GO stays live. A greyed-out button is the silent no-op with a style on
    // it: the student taps, nothing happens, nothing explains why — and on a
    // phone they cannot even see which control is refusing. Kahoot's Join is
    // always tappable and answers with a sentence; so is this one.
    render(<JoinFlow initialCode="P45KRT" />);
    expect(goButton()).not.toBeDisabled();

    fireEvent.click(goButton());

    expect(mockJoin).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'education.student.join.flow.nameRequired'
    );
    // And the cursor is put where the fix is.
    expect(nameField()).toHaveFocus();
  });
});

describe('<JoinFlow> — failures the student can act on', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy' });
  });

  const attempt = async (name = 'Priya') => {
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: name } });
    fireEvent.click(goButton());
  };

  it('offers the free nickname and submits THAT name, not the one that clashed', async () => {
    mockJoin.mockResolvedValue({ success: false, code: 'NAME_TAKEN', suggestedName: 'Priya 2' });
    await attempt('Priya');

    const takeIt = await screen.findByRole('button', {
      name: /education\.student\.join\.useSuggestedName/,
    });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1' });
    fireEvent.click(takeIt);

    // setState is async; retrying off state would resend "Priya" and loop.
    await waitFor(() =>
      expect(mockJoin).toHaveBeenLastCalledWith('P45KRT', { guestName: 'Priya 2' })
    );
  });

  it('keeps the typed nickname after a failed attempt', async () => {
    mockJoin.mockResolvedValue({ success: false, error: 'boom' });
    await attempt('Maya');
    await screen.findByRole('alert');
    expect(nameField()).toHaveValue('Maya');
  });

  it('only blames the CODE when the code was actually wrong', async () => {
    mockJoin.mockResolvedValue({ success: false, code: 'INVALID_CODE' });
    await attempt('Maya');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('education.student.join.invalidCode');
    // Actionable: put them back on the field they have to fix.
    await waitFor(() => expect(onNameStep()).toBe(false));
  });

  it('does NOT blame the code for a server fault', async () => {
    mockJoin.mockResolvedValue({ success: false, error: 'network' });
    await attempt('Maya');
    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('education.student.join.invalidCode');
    expect(onNameStep()).toBe(true);
  });

  it('says the class is full in words a student can read', async () => {
    mockJoin.mockResolvedValue({ success: false, code: 'STUDENT_LIMIT_REACHED' });
    await attempt('Maya');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'education.student.join.classroomFull'
    );
  });

  it('recovers from a thrown join instead of freezing under a spinner', async () => {
    mockJoin.mockRejectedValue(new Error('kaboom'));
    await attempt('Maya');
    await screen.findByRole('alert');
    expect(goButton()).not.toBeDisabled();
  });
});

describe('<JoinFlow> — the tap that landed too early', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1' });
  });

  it('replays a GO pressed before the session resolved, exactly once', async () => {
    // The QR path: cold load, code pre-filled, a name typed in a second flat.
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { rerender } = render(<JoinFlow initialCode="P45KRT" />);

    fireEvent.change(nameField(), { target: { value: 'Maya' } });
    fireEvent.click(goButton());
    expect(mockJoin).not.toHaveBeenCalled();

    // Session resolves.
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    await act(async () => {
      rerender(<JoinFlow initialCode="P45KRT" />);
    });

    await waitFor(() => expect(mockJoin).toHaveBeenCalledTimes(1));
  });

  it('tells the student it is holding their tap, rather than looking dead', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: 'Maya' } });
    fireEvent.click(goButton());
    expect(screen.getByRole('status')).toHaveTextContent('education.student.join.preparing');
  });
});

describe('<JoinFlow> — a student who already has an account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Year 9 English' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1' });
  });

  it('is never asked to invent a nickname', () => {
    render(<JoinFlow initialCode="P45KRT" />);
    expect(screen.queryByLabelText('education.student.join.nameLabel')).not.toBeInTheDocument();
    expect(goButton()).not.toBeDisabled();
  });

  it('joins without a guest name', async () => {
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.click(goButton());
    await waitFor(() => expect(mockJoin).toHaveBeenCalledWith('P45KRT', undefined));
  });

  it('still shows the nickname row after the first tap mints an anon user mid-flow', async () => {
    // `joinClassroom` signs the guest in BEFORE the join request, so `user`
    // stops being null even when the join then fails. On `!user` alone the row
    // vanished on the retry and the student could not fix the name.
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockJoin.mockResolvedValue({ success: false, code: 'NAME_TAKEN', suggestedName: 'Maya 2' });
    const { rerender } = render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: 'Maya' } });
    fireEvent.click(goButton());
    await screen.findByRole('alert');

    mockUseAuth.mockReturnValue({ user: { id: 'anon-1' }, loading: false });
    rerender(<JoinFlow initialCode="P45KRT" />);

    expect(nameField()).toHaveValue('Maya');
  });
});

describe('<JoinFlow> — the sign-in return path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy' });
  });

  it('stashes the code so a student who picks an account comes back to it', () => {
    // `useAuthInitialization` reads this key on SIGNED_IN. It used to be set by
    // `/join/[code]` alone, so the same student arriving via `?code=` or
    // typing the code lost their place on the way back from sign-in.
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<JoinFlow />);
    typeCode('P45KRT');
    expect(sessionStorage.getItem('joinClassroomReturnCode')).toBe('P45KRT');
  });

  it('stashes a pre-filled code from the QR path too', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<JoinFlow initialCode="P45KRT" />);
    expect(sessionStorage.getItem('joinClassroomReturnCode')).toBe('P45KRT');
  });

  it('does not stash for a student who is already signed in', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    render(<JoinFlow initialCode="P45KRT" />);
    expect(sessionStorage.getItem('joinClassroomReturnCode')).toBeNull();
  });
});

describe('<JoinFlow> — the hold can never become the dead end', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1' });
  });

  it('submits anyway if the session never resolves', async () => {
    // `useAuth` outside its provider returns `loading: true` FOREVER. On this
    // screen that would mean: every tap queues, "getting ready" shows for the
    // rest of the lesson, and nothing is ever sent — the silent no-op with a
    // spinner painted on it (recurring pitfall class 4). The server path is
    // authoritative anyway, so a stuck session must not be a locked door.
    vi.useFakeTimers();
    try {
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      render(<JoinFlow initialCode="P45KRT" />);
      fireEvent.change(nameField(), { target: { value: 'Maya' } });
      fireEvent.click(goButton());
      expect(mockJoin).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });

      expect(mockJoin).toHaveBeenCalledTimes(1);
      expect(mockJoin).toHaveBeenCalledWith('P45KRT', { guestName: 'Maya' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not fire twice when the session resolves just before the deadline', async () => {
    vi.useFakeTimers();
    try {
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      const { rerender } = render(<JoinFlow initialCode="P45KRT" />);
      fireEvent.change(nameField(), { target: { value: 'Maya' } });
      fireEvent.click(goButton());

      mockUseAuth.mockReturnValue({ user: null, loading: false });
      await act(async () => {
        rerender(<JoinFlow initialCode="P45KRT" />);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });

      expect(mockJoin).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('<JoinFlow> — re-asking about a code the student retyped', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy' });
  });

  it('looks the code up again after a backspace and a retype', async () => {
    // Forgetting to reset the "last looked up" marker means retyping the
    // character just deleted matches the dedupe guard and never re-fetches —
    // the confirmation card then never comes back for the rest of the session.
    render(<JoinFlow />);
    typeCode('P45KRT');
    await waitFor(() => expect(mockResolve).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /education\.student\.join\.flow\.changeCode/ }));
    typeCode('P45KR');
    typeCode('P45KRT');

    await waitFor(() => expect(mockResolve).toHaveBeenCalledTimes(2));
  });
});
