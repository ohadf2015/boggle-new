/**
 * The first tap, and the three ways it used to be wasted.
 *
 * Recovered coverage: the deleted `JoinClassroomForm.{firstTap, previewNeverGates,
 * nameTaken}` suites each guarded one of these, and every one is a real report
 * from this product:
 *
 *  1. GO pressed while the code lookup was still in flight did NOTHING — the
 *     old form gated submission on a confirmed preview, so the student tapped,
 *     nothing happened, and the second tap (after the lookup landed) worked.
 *     "Tap it twice" is not a ten-second join.
 *  2. A five-character code submitted with no explanation at all.
 *  3. A duplicate nickname left its suggestion on screen after the student had
 *     typed a different name — a banner about a name nobody is using.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth, mockPush } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
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
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

const nameField = () => screen.getByLabelText('education.student.join.nameLabel');
const goButton = () => screen.getByRole('button', { name: /education\.student\.join\.flow\.go/ });
const nextButton = () =>
  screen.getByRole('button', { name: /education\.student\.join\.flow\.next/ });
const codeField = () => screen.getByLabelText('education.student.join.codeLabel');

/** A lookup that never answers — the slow school wifi case. */
const hangingLookup = () => new Promise<never>(() => {});

/**
 * Every live refusal, joined. The name step can legitimately hold TWO alerts
 * at once (a rejected code and a form error), and `getByRole('alert')` throws
 * on the second one — turning an unrelated change into a failure here.
 */
const alerts = () => screen.queryAllByRole('alert').map((el) => el.textContent ?? '').join(' | ');

describe('<JoinFlow> — the first tap counts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockImplementation(hangingLookup);
  });

  it('joins on the FIRST tap even though the lookup has not come back', async () => {
    mockJoin.mockResolvedValue({ success: true, gameCode: 'P45KRT' });
    render(<JoinFlow initialCode="P45KRT" />);

    fireEvent.change(nameField(), { target: { value: 'Maya' } });
    fireEvent.click(goButton());

    await waitFor(() => expect(mockJoin).toHaveBeenCalledTimes(1));
    expect(mockJoin).toHaveBeenCalledWith('P45KRT', { guestName: 'Maya' });
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=P45KRT&classroom=true')
    );
  });

  it('does not fire the join twice when the tap is repeated mid-flight', async () => {
    let settle: (v: unknown) => void = () => {};
    mockJoin.mockImplementation(() => new Promise((r) => { settle = r; }));
    render(<JoinFlow initialCode="P45KRT" />);

    fireEvent.change(nameField(), { target: { value: 'Maya' } });
    // Held onto deliberately: mid-flight the button relabels itself to
    // "joining", so re-querying by name would miss the very element an impatient
    // student is jabbing at.
    const go = goButton();
    fireEvent.click(go);
    fireEvent.click(go);
    expect(mockJoin).toHaveBeenCalledTimes(1);

    settle({ success: true });
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
  });

  it('lands a late class name INSIDE the reserved slot, not above the button', async () => {
    // jsdom does not lay out, so this asserts the contract that produces the
    // pixels: one slot, present before the answer arrives, carrying a minimum
    // height, and the SAME node once the answer lands. A confirmation that
    // mounts its own box instead is what shoved GO out from under a finger.
    let land: (t: unknown) => void = () => {};
    mockResolve.mockImplementation(() => new Promise((r) => { land = r; }));
    render(<JoinFlow initialCode="P45KRT" />);

    const before = screen.getByTestId('join-confirm-slot');
    expect(before.className).toMatch(/min-h-/);

    land({ verdict: 'classroom', label: 'Year 9 English' });
    await screen.findByText('Year 9 English');

    const after = screen.getByTestId('join-confirm-slot');
    expect(after).toBe(before);
    expect(after).toContainElement(screen.getByText('Year 9 English'));
  });
});

describe('<JoinFlow> — a code that is not six characters yet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockImplementation(hangingLookup);
  });

  it('says what is missing, inline, and does not move on', () => {
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'P45K' } });
    fireEvent.click(nextButton());

    expect(alerts()).toContain('education.student.join.flow.codeTooShort');
    // Still on the code step, and nothing was sent anywhere.
    expect(codeField()).toBeInTheDocument();
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('clears that complaint the moment the student types again', () => {
    render(<JoinFlow />);
    fireEvent.change(codeField(), { target: { value: 'P45K' } });
    fireEvent.click(nextButton());
    expect(alerts()).toContain('education.student.join.flow.codeTooShort');

    fireEvent.change(codeField(), { target: { value: 'P45KR' } });
    expect(alerts()).toBe('');
  });
});

describe('<JoinFlow> — a nickname somebody else already took', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockImplementation(hangingLookup);
  });

  it('drops the suggestion as soon as the student picks their own name instead', async () => {
    mockJoin.mockResolvedValue({ success: false, code: 'NAME_TAKEN', suggestedName: 'Maya2' });
    render(<JoinFlow initialCode="P45KRT" />);

    fireEvent.change(nameField(), { target: { value: 'Maya' } });
    fireEvent.click(goButton());

    const suggestion = await screen.findByText(/education\.student\.join\.nameTaken/);
    expect(suggestion).toBeInTheDocument();

    fireEvent.change(nameField(), { target: { value: 'Maya the Great' } });
    expect(screen.queryByText(/education\.student\.join\.nameTaken/)).not.toBeInTheDocument();

    // And the button is live again for the new name — not stuck behind the
    // banner that was about the old one.
    expect(goButton()).not.toBeDisabled();
  });
});

describe('<JoinFlow> — a tap with no name while the session is still resolving', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The QR window: auth has not answered yet.
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    mockResolve.mockImplementation(hangingLookup);
  });

  it('asks for the name instead of pretending to be busy', () => {
    // Recovered from the deleted `queuedIntent` suite. Two things can be
    // missing at once here, and only one of them is the student's to fix. If
    // the auth hold is checked first, a student with an empty name watches
    // "getting ready…" forever while the thing actually blocking them is a
    // field they can fill in one second (recurring pitfall class 4).
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.click(goButton());

    expect(alerts()).toContain('education.student.join.flow.nameRequired');
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('still holds the tap once the name IS there, and replays it', async () => {
    mockJoin.mockResolvedValue({ success: true });
    const { rerender } = render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: 'Maya' } });
    fireEvent.click(goButton());

    // Held, not dropped, and it says so rather than looking dead.
    expect(mockJoin).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('education.student.join.preparing');

    mockUseAuth.mockReturnValue({ user: null, loading: false });
    rerender(<JoinFlow initialCode="P45KRT" />);
    await waitFor(() => expect(mockJoin).toHaveBeenCalledTimes(1));
  });
});

describe('<JoinFlow> — the session resolves and changes what is being asked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    mockResolve.mockImplementation(hangingLookup);
  });

  it('drops the "pick a name" demand once the session turns out to be signed in', () => {
    // `showNameField` derives from auth, which resolves LATE (pitfall class 1).
    // A refusal about a field that no longer exists is a demand the student
    // cannot possibly satisfy: no input, no way to clear it, GO sitting there.
    const { rerender } = render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.click(goButton());
    expect(alerts()).toContain('education.student.join.flow.nameRequired');

    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    rerender(<JoinFlow initialCode="P45KRT" />);

    expect(screen.queryByLabelText('education.student.join.nameLabel')).toBeNull();
    expect(alerts()).toBe('');
  });

  it('joins exactly once no matter how many times an impatient student taps while held', async () => {
    mockJoin.mockResolvedValue({ success: true });
    const { rerender } = render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: 'Maya' } });

    const go = goButton();
    fireEvent.click(go);
    fireEvent.click(go);
    fireEvent.click(go);
    expect(mockJoin).not.toHaveBeenCalled();

    mockUseAuth.mockReturnValue({ user: null, loading: false });
    rerender(<JoinFlow initialCode="P45KRT" />);

    await waitFor(() => expect(mockJoin).toHaveBeenCalledTimes(1));
    // And it stays one after the dust settles.
    await new Promise((r) => setTimeout(r, 20));
    expect(mockJoin).toHaveBeenCalledTimes(1);
  });
});
