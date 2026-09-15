import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * A code we have ALREADY been told is wrong must not push the student forward.
 *
 * The flow's founding rule stands and is not touched here: nothing WAITS on the
 * code lookup, because a class of thirty behind one school IP exhausts that
 * route's rate limit and the slow answer becomes a spinner between a student
 * and their next keystroke. The sixth character still moves them.
 *
 * But "don't wait for an answer" was implemented as "ignore the answer". Once
 * the verdict for the code IN THE FIELD is `invalid`, `advance()` still only
 * checked the length, so every route back through the code step threw the
 * student at the nickname again: type a bad code → land on the nickname →
 * "change code" → the same six characters, the same known-bad verdict, NEXT →
 * thrown forward again, with the red alert scrolling past on the way. The
 * student never gets a still frame in which to fix the thing that is wrong.
 *
 * So the gate is on a verdict ALREADY IN HAND, never on one being awaited:
 *   - `invalid` for exactly the code being advanced  → stay, show the reason;
 *   - unknown, still checking, `unverified`          → advance, unchanged;
 *   - a verdict about a DIFFERENT code               → ignored (the sixth
 *     keystroke arrives with `codeArg` newer than the `target` in scope, and
 *     blocking on a stale verdict would resurrect the very wait we refuse).
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
const typeCode = (value: string) => fireEvent.change(codeField(), { target: { value } });
const onNameStep = () => screen.queryByLabelText('education.student.join.nameLabel') !== null;
const nextButton = () => screen.getByRole('button', { name: /education\.student\.join\.flow\.next/ });
const changeCodeButton = () =>
  screen.getByRole('button', { name: /education\.student\.join\.flow\.changeCode/ });

/** Walk a rejected code all the way back to the code step, alert showing. */
async function backOnTheCodeStepWithARejectedCode() {
  render(<JoinFlow initialCode="ZZZZZZ" />);
  await screen.findByRole('alert');
  fireEvent.click(changeCodeButton());
  expect(onNameStep()).toBe(false);
}

describe('<JoinFlow> — a code already known to be wrong', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'invalid' });
  });

  it('GIVEN the verdict is in WHEN the student presses NEXT again THEN they stay on the code step', async () => {
    await backOnTheCodeStepWithARejectedCode();

    fireEvent.click(nextButton());

    expect(onNameStep()).toBe(false);
  });

  it('GIVEN they stay THEN the reason is still on screen, not scrolled past', async () => {
    await backOnTheCodeStepWithARejectedCode();

    fireEvent.click(nextButton());

    expect(screen.getByRole('alert')).toHaveTextContent('education.student.join.invalidCode');
  });

  it('GIVEN the code was TYPED rather than deep-linked THEN the same loop closes', async () => {
    // The student's own journey, and the one the QR path never exercises: six
    // characters typed, thrown forward, verdict lands, back to fix it.
    render(<JoinFlow />);
    typeCode('ZZZZZZ');
    await screen.findByRole('alert');
    fireEvent.click(changeCodeButton());

    fireEvent.click(nextButton());

    expect(onNameStep()).toBe(false);
  });

  it('GIVEN a DIFFERENT code WHEN its sixth character lands THEN it moves at once, stale verdict ignored', async () => {
    await backOnTheCodeStepWithARejectedCode();
    // The lookup for the new code has not answered; `target` still describes
    // ZZZZZZ. Blocking here would put a network wait back on the keystroke.
    mockResolve.mockImplementation(() => new Promise<never>(() => {}));

    typeCode('P45KRT');

    expect(onNameStep()).toBe(true);
  });
});

describe('<JoinFlow> — a verdict we do NOT have does not gate anything', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('GIVEN the lookup never answers THEN the sixth character still moves the student', () => {
    mockResolve.mockImplementation(() => new Promise<never>(() => {}));
    render(<JoinFlow />);

    typeCode('P45KRT');

    expect(onNameStep()).toBe(true);
  });

  it('GIVEN the lookup could not be performed (`unverified`) THEN the student carries on', async () => {
    mockResolve.mockResolvedValue({ verdict: 'unverified' });
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.click(changeCodeButton());

    fireEvent.click(nextButton());

    expect(onNameStep()).toBe(true);
  });
});
