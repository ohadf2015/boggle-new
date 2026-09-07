import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * The join screen's hero art is a mascot pointing at an empty cream card — the
 * card is a speech-bubble FRAME the artwork leaves blank for copy to sit in. No
 * copy ever went in, so a live critic run saw a blank bubble on the very first
 * screen a student sees, in both `/en/join/<CODE>` and `/he/join/<CODE>`.
 *
 * Either the bubble carries a line or it should not be drawn. It carries a line.
 */
const { mockJoin, mockPreview, mockUseAuth, mockPush } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockPreview: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...p }: Record<string, unknown>) => React.createElement('div', p as never, children as React.ReactNode) }),
}));
vi.mock('@/lib/education/classroomPreview', () => ({ lookupClassroomPreview: mockPreview }));

const { mockLanguage } = vi.hoisted(() => ({ mockLanguage: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: mockLanguage }));

import JoinClassroomForm from '../JoinClassroomForm';

describe('JoinClassroomForm — the mascot bubble is never blank', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreview.mockResolvedValue(null);
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockLanguage.mockReturnValue({ t: (k: string) => k, dir: 'ltr', language: 'en' });
  });

  it('renders a translated line inside the hero bubble', () => {
    render(<JoinClassroomForm />);

    const bubble = screen.getByTestId('join-hero-bubble');
    expect(bubble).toBeInTheDocument();
    expect(bubble.textContent?.trim()).toBe('education.student.join.heroLine');
  });

  it('keeps the line in the flow on an RTL locale too', () => {
    mockLanguage.mockReturnValue({ t: (k: string) => k, dir: 'rtl', language: 'he' });
    render(<JoinClassroomForm />);

    expect(screen.getByTestId('join-hero-bubble').textContent?.trim()).toBe(
      'education.student.join.heroLine'
    );
  });
});
