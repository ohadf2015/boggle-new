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
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: mockToast }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

describe('<JoinFlow> legal links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'classroom', label: 'Ms Levy' });
  });

  it('GIVEN the code screen THEN privacy and terms are one tap away in the locale', () => {
    render(<JoinFlow />);
    expect(screen.getByRole('link', { name: 'legal.privacyPolicy' })).toHaveAttribute('href', '/en/legal/privacy');
    expect(screen.getByRole('link', { name: 'legal.termsOfService' })).toHaveAttribute('href', '/en/legal/terms');
  });
});
