import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPush = vi.fn();
const mockT = vi.fn((key: string) => key);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

vi.mock('@/hooks/useActiveClassroomGame', () => ({
  useActiveClassroomGame: () => ({ activeGame: null }),
}));

vi.mock('@/components/student/PlayWithClassButton', () => ({
  PlayWithClassButton: (props: Record<string, unknown>) => (
    <div data-testid="play-with-class" data-classroom={props.classroomId} />
  ),
}));

vi.mock('@/components/student/ClassroomGameBanner', () => ({
  ClassroomGameBanner: (props: Record<string, unknown>) => (
    <div data-testid="game-banner" data-classroom={props.classroomId} />
  ),
}));

vi.mock('framer-motion', () => {
  const R = require('react');
  const Div = R.forwardRef(function Div(props: Record<string, unknown>, ref: unknown) {
    const { children, ...rest } = props as React.PropsWithChildren<Record<string, unknown>>;
    return R.createElement('div', { ...rest, ref }, children);
  });
  return {
    m: { div: Div, button: Div },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { StudentHubPlayZone } from '../StudentHubPlayZone';

describe('StudentHubPlayZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PlayWithClassButton with correct props', () => {
    render(
      <StudentHubPlayZone classroomId="cls-1" userId="u-1" username="Alice" />
    );
    const btn = screen.getByTestId('play-with-class');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('data-classroom', 'cls-1');
  });

  it('renders Quick Duel button', () => {
    render(
      <StudentHubPlayZone classroomId="cls-1" userId="u-1" username="Alice" />
    );
    expect(screen.getByText('student.dashboard.quickDuel')).toBeInTheDocument();
  });

  it('navigates to duels on Quick Duel click', () => {
    render(
      <StudentHubPlayZone classroomId="cls-1" userId="u-1" username="Alice" />
    );
    fireEvent.click(screen.getByText('student.dashboard.quickDuel'));
    expect(mockPush).toHaveBeenCalledWith('/en/education/duels?classroomId=cls-1');
  });

  it('renders ClassroomGameBanner', () => {
    render(
      <StudentHubPlayZone classroomId="cls-1" userId="u-1" username="Alice" />
    );
    expect(screen.getByTestId('game-banner')).toBeInTheDocument();
  });

  it('renders section title using t()', () => {
    render(
      <StudentHubPlayZone classroomId="cls-1" userId="u-1" username="Alice" />
    );
    expect(mockT).toHaveBeenCalledWith('student.hub.playZone');
  });
});
