import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
const typeCode = (value: string) => fireEvent.change(codeField(), { target: { value } });
const onNameStep = () => screen.queryByLabelText('education.student.join.nameLabel') !== null;

describe('<JoinFlow> eg2: a wrong code never strands the student on PICK A NAME', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'invalid' });
  });

  it('GIVEN a typed code WHEN the verdict lands invalid THEN the student is back on the code step with the reason', async () => {
    render(<JoinFlow />);
    typeCode('ZZZZZZ');
    expect(onNameStep()).toBe(true);

    await waitFor(() => expect(onNameStep()).toBe(false));
    expect(screen.getByRole('alert')).toHaveTextContent('education.student.join.invalidCode');
  });

  it('GIVEN the deep link /join/ZZZZZZ WHEN the verdict lands invalid THEN the code step shows, not the name step', async () => {
    render(<JoinFlow initialCode="ZZZZZZ" />);

    await waitFor(() => expect(onNameStep()).toBe(false));
    expect(codeField()).toHaveValue('ZZZZZZ');
  });

  it('GIVEN a valid game code THEN the student stays on the name step', async () => {
    mockResolve.mockResolvedValue({ verdict: 'game', gameCode: 'P45KRT' });
    render(<JoinFlow initialCode="P45KRT" />);

    await new Promise((r) => setTimeout(r, 20));
    expect(onNameStep()).toBe(true);
  });
});

describe('<JoinFlow> eg2: the page is not boxed to a phone tile on desktop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockImplementation(() => new Promise<never>(() => {}));
  });

  it('GIVEN any viewport THEN no ancestor is pinned to 390x844', () => {
    const { container } = render(<JoinFlow />);
    const pinned = [...container.querySelectorAll<HTMLElement>('[style]')].filter(
      (el) => el.style.width === '390px' || el.style.height === '844px',
    );
    expect(pinned).toEqual([]);
  });
});

describe('<JoinFlow> eg2: a code longer than six is refused out loud, never cut to six', () => {
  const TOO_LONG = 'eg2Fix.join.codeTooLong';

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'game', gameCode: 'JEHRIW' });
  });

  it('GIVEN the deep link /join/JEHRIWE THEN the code step shows the too-long reason and no truncated code', async () => {
    render(<JoinFlow initialCode="JEHRIWE" />);

    expect(onNameStep()).toBe(false);
    expect(codeField()).toHaveValue('');
    expect(screen.getByRole('alert')).toHaveTextContent(TOO_LONG);
    await new Promise((r) => setTimeout(r, 20));
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it('GIVEN a seven-character code pasted into the field THEN it is refused with the reason, not cut', () => {
    render(<JoinFlow />);
    fireEvent.paste(codeField(), { clipboardData: { getData: () => 'JEHRIWE' } });

    expect(onNameStep()).toBe(false);
    expect(codeField()).toHaveValue('');
    expect(screen.getByRole('alert')).toHaveTextContent(TOO_LONG);
  });

  it('GIVEN a seven-character code on the clipboard WHEN the paste button is tapped THEN it is refused with the reason', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: vi.fn().mockResolvedValue('JEHRIWE') },
    });
    render(<JoinFlow />);
    fireEvent.click(screen.getByLabelText('joinView.pasteCode'));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(TOO_LONG));
    expect(onNameStep()).toBe(false);
    expect(codeField()).toHaveValue('');
  });

  it('GIVEN a six-character code pasted with spaces THEN it still goes through', () => {
    render(<JoinFlow />);
    fireEvent.paste(codeField(), { clipboardData: { getData: () => 'P45 KRT' } });

    expect(onNameStep()).toBe(true);
  });
});
