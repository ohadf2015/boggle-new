import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth, mockStoredName } = vi.hoisted(() => ({
  mockStoredName: vi.fn(() => null as string | null),
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, params?: Record<string, string>) =>
      k === 'eduStudent.join.funNames' ? 'Pixel Panda|Captain Otter|Turbo Toast' : params ? `${k}:${JSON.stringify(params)}` : k,
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/profileStorage', () => ({
  getStoredUsername: mockStoredName,
  setStoredUsername: vi.fn(),
}));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

const nameField = () => screen.getByLabelText('education.student.join.nameLabel') as HTMLInputElement;
const goButton = () => screen.getAllByRole('button').find((b) => b.textContent?.includes('education.student.join.flow.go'))!;

describe('<JoinFlow> a name that cannot go on the class screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoredName.mockReturnValue(null);
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy', gameCode: 'P45KRT' });
  });

  it('Given the server refuses the name, When the student taps GO, Then a kind message offers a fun name they can take in one tap', async () => {
    mockJoin.mockResolvedValueOnce({ success: false, code: 'NAME_NOT_ALLOWED', suggestedName: 'Turbo Toast' });
    mockJoin.mockResolvedValueOnce({ success: true, gameCode: 'P45KRT' });
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: 'rude word' } });
    fireEvent.click(goButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('education.student.join.nameNotAllowed');
    expect(alert).not.toHaveTextContent('education.student.join.nameTaken');
    fireEvent.click(screen.getByText(/education\.student\.join\.useSuggestedName/));
    await waitFor(() => expect(mockJoin).toHaveBeenLastCalledWith('P45KRT', expect.objectContaining({ guestName: 'Turbo Toast' })));
  });

  it('Given the name is refused, Then GO is disabled and the suggested name is the one primary, until the student types a new name', async () => {
    mockJoin.mockResolvedValueOnce({ success: false, code: 'NAME_NOT_ALLOWED', suggestedName: 'Turbo Toast' });
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(nameField(), { target: { value: 'rude word' } });
    fireEvent.click(goButton());
    await screen.findByRole('alert');
    expect(goButton()).toBeDisabled();
    const suggestion = screen.getByText(/education\.student\.join\.useSuggestedName/).closest('button')!;
    expect(suggestion).toHaveAttribute('data-primary', 'true');
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('data-primary') === 'true')).toHaveLength(1);
    fireEvent.change(nameField(), { target: { value: 'Dana' } });
    expect(goButton()).not.toBeDisabled();
    expect(goButton()).toHaveAttribute('data-primary', 'true');
  });
});
