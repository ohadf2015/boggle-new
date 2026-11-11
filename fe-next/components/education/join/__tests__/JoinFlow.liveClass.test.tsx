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

describe('<JoinFlow> a code whose class is playing right now', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoredName.mockReturnValue(null);
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('Given a class code while the class plays, Then the card names the class and says they join straight in', async () => {
    mockResolve.mockResolvedValue({ verdict: 'game', label: '7B English', classroomId: 'c1', gameCode: 'P45KRT' });
    render(<JoinFlow initialCode="K7Q2WM" />);
    const card = await screen.findByTestId('join-target-card');
    expect(card).toHaveAttribute('data-live', 'true');
    expect(card).toHaveTextContent('7B English');
    expect(card).toHaveTextContent('education.student.join.preview.gameConfirm');
    expect(card).not.toHaveTextContent('education.student.join.preview.classroomNext');
  });

  it('Given a live game whose class name is unknown, Then the card still says the class is playing, with no teacher name', async () => {
    mockResolve.mockResolvedValue({ verdict: 'game', classroomId: 'c1', gameCode: 'P45KRT' });
    render(<JoinFlow initialCode="P45KRT" />);
    const card = await screen.findByTestId('join-target-card');
    expect(card).toHaveTextContent('education.student.join.preview.gameConfirm');
  });
});
