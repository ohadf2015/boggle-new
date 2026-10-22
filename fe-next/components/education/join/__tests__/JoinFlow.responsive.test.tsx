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
    t: (k: string, params?: Record<string, unknown>) => (params ? `${k}:${JSON.stringify(params)}` : k),
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/hooks/useStudentProgress', () => ({ useStudentProgress: () => ({ lessons: [], isLoading: false }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

const K = 'education.student.join';
const root = () => screen.getByTestId('join-root');
const nameField = () => screen.getByLabelText(`${K}.nameLabel`) as HTMLInputElement;
const goButton = () => screen.getByRole('button', { name: new RegExp(`${K}\\.flow\\.go`) });
const LANDSCAPE = '[@media(orientation:landscape)_and_(max-height:520px)_and_(min-width:600px)]:grid-cols-2';

describe('<JoinFlow> layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Year 9 English' });
  });

  it('Given the standalone door, Then it paints its own navy and decorations', () => {
    render(<JoinFlow />);
    expect(root().className).toContain('bg-neo-navy');
    expect(screen.getByTestId('join-decor')).toBeInTheDocument();
  });

  it('Given the academy door, Then the root is transparent so the arena backdrop shows, with no slabs', () => {
    render(<JoinFlow variant="academy" />);
    expect(root().className).not.toMatch(/(^|\s)bg-neo-navy(\s|$)/);
    expect(screen.queryByTestId('join-decor')).not.toBeInTheDocument();
  });

  it('never clips: the root scrolls instead of hiding content behind an open keyboard', () => {
    render(<JoinFlow variant="academy" />);
    expect(root().className).toContain('overflow-y-auto');
    expect(root().className).not.toContain('overflow-hidden');
  });

  it('sizes with CSS, not a JS zoom pinned to a phone design', () => {
    render(<JoinFlow variant="academy" />);
    expect(screen.getByTestId('join-stage').style.zoom).toBe('');
    expect(screen.getByTestId('join-stage').style.width).toBe('');
  });

  it('Given a phone on its side, Then both steps lay out as two columns', async () => {
    const { unmount } = render(<JoinFlow />);
    expect(screen.getByTestId('join-code-step').className).toContain(LANDSCAPE);
    unmount();
    render(<JoinFlow initialCode="P45KRT" />);
    expect(screen.getByTestId('join-name-step').className).toContain(LANDSCAPE);
  });
});

describe('<JoinFlow> code step guidance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Year 9 English' });
  });

  it('shows a visible "where do I find the code?" answer on the code step', () => {
    render(<JoinFlow />);
    expect(screen.getByText(`${K}.flow.whereCode`)).toBeVisible();
    expect(screen.getByText(`${K}.flow.whereCodeAnswer`)).toBeInTheDocument();
  });

  it('labels the progress dots for screen readers', () => {
    render(<JoinFlow />);
    expect(screen.getByText(`${K}.flow.stepOf:${JSON.stringify({ current: 1, total: 2 })}`)).toHaveClass('sr-only');
  });

  it('keeps error shakes behind motion-safe', async () => {
    render(<JoinFlow />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${K}\\.flow\\.next`) }));
    const alert = await screen.findByRole('alert');
    expect(alert.className).toContain('motion-safe:animate-neo-shake');
    expect(alert.className).not.toMatch(/(^|\s)animate-neo-shake/);
  });
});

describe('<JoinFlow> name step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('Given a class code with no live game, Then it says what happens next', async () => {
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Year 9 English' });
    render(<JoinFlow initialCode="P45KRT" />);
    expect(await screen.findByText(`${K}.preview.classroomNext`)).toBeInTheDocument();
  });

  it('Given a live game code, Then it says they go straight into the game', async () => {
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy', gameCode: 'P45KRT' });
    render(<JoinFlow initialCode="P45KRT" />);
    expect(await screen.findByText(`${K}.preview.gameConfirm`)).toBeInTheDocument();
  });

  it('shows the dice as a labelled button, not a bare icon', () => {
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Year 9 English' });
    render(<JoinFlow initialCode="P45KRT" />);
    expect(screen.getByRole('button', { name: 'eduStudent.join.surpriseMe' })).toHaveTextContent('eduStudent.join.surpriseMe');
  });

  it('Given our side fails, Then the student reads what to do, not a bare "error"', async () => {
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Year 9 English' });
    mockJoin.mockResolvedValue({ success: false, error: 'boom' });
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: 'Zoe' } });
    fireEvent.click(goButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(`${K}.flow.genericError`);
    expect(alert).not.toHaveTextContent('common.error');
  });

  it('Given a signed-in student with nothing to type, Then focus lands on GO', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Year 9 English' });
    render(<JoinFlow />);
    fireEvent.change(screen.getByTestId('join-code-input'), { target: { value: 'P45KRT' } });
    await waitFor(() => expect(goButton()).toHaveFocus());
  });
});

describe('<JoinFlow> success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('Given a class join, Then the success state names the class and takes focus', async () => {
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Year 9 English' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1' });
    render(<JoinFlow initialCode="P45KRT" />);
    await screen.findByText('Year 9 English');
    fireEvent.change(nameField(), { target: { value: 'Zoe' } });
    fireEvent.click(goButton());
    const panel = await screen.findByTestId('join-success-panel');
    expect(panel).toHaveTextContent('Year 9 English');
    await waitFor(() => expect(screen.getByRole('heading', { name: `${K}.success` })).toHaveFocus());
  });

  it('Given a live game join, Then the celebration says they are heading into the game', async () => {
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy', gameCode: 'P45KRT' });
    mockJoin.mockResolvedValue({ success: true, classroomId: 'c1', gameCode: 'P45KRT' });
    render(<JoinFlow initialCode="P45KRT" />);
    await screen.findByText('Ms Levy');
    fireEvent.change(nameField(), { target: { value: 'Zoe' } });
    fireEvent.click(goButton());
    const panel = await screen.findByTestId('join-success-panel');
    expect(panel).toHaveTextContent('Ms Levy');
    expect(panel).toHaveTextContent(`${K}.flow.successGame`);
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
  });
});

describe('<JoinFlow> before the catalogue loads', () => {
  it('never seeds the raw fun-names key as the nickname', async () => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Year 9 English' });
    render(<JoinFlow initialCode="P45KRT" />);
    await screen.findByText('Year 9 English');
    expect(nameField().value).not.toContain('funNames');
    fireEvent.click(screen.getByRole('button', { name: 'eduStudent.join.surpriseMe' }));
    expect(nameField().value).not.toContain('funNames');
  });
});
