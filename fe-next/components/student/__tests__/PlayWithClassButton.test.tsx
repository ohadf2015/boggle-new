import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock dependencies
const mockPush = vi.fn();
const mockT = vi.fn((key: string, params?: Record<string, string | number>) => {
  if (params) {
    let result = key;
    for (const [k, v] of Object.entries(params)) {
      result += ` ${k}=${v}`;
    }
    return result;
  }
  return key;
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

// Mock the hook
const mockUseActiveClassroomGame = vi.fn();
vi.mock('@/hooks/useActiveClassroomGame', () => ({
  useActiveClassroomGame: (...args: unknown[]) => mockUseActiveClassroomGame(...args),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const MockDiv = React.forwardRef(function MockDiv(props: Record<string, unknown>, ref: unknown) {
    const { children, ...rest } = props as React.PropsWithChildren<Record<string, unknown>>;
    return React.createElement('div', { ...rest, ref }, children);
  });
  const MockButton = React.forwardRef(function MockButton(props: Record<string, unknown>, ref: unknown) {
    const { children, ...rest } = props as React.PropsWithChildren<Record<string, unknown>>;
    return React.createElement('button', { ...rest, ref }, children);
  });
  return {
    m: { div: MockDiv, button: MockButton },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { PlayWithClassButton } from '../PlayWithClassButton';

describe('PlayWithClassButton', () => {
  const defaultProps = {
    classroomId: 'class-123',
    userId: 'user-456',
    username: 'TestStudent',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActiveClassroomGame.mockReturnValue({ activeGame: null, isConnected: false });
  });

  it('renders "Play with Class" when no active game', () => {
    mockUseActiveClassroomGame.mockReturnValue({ activeGame: null, isConnected: true });
    render(<PlayWithClassButton {...defaultProps} />);

    expect(screen.getByText('student.playWithClass.title')).toBeInTheDocument();
    expect(screen.getByText('student.playWithClass.noActiveGame')).toBeInTheDocument();
  });

  it('renders "Join Now" when active game detected', () => {
    mockUseActiveClassroomGame.mockReturnValue({
      activeGame: {
        gameCode: 'ABC123',
        teacherName: 'Ms. Smith',
        lessonNames: ['Vocab'],
        playerCount: 5,
      },
      isConnected: true,
    });

    render(<PlayWithClassButton {...defaultProps} />);

    expect(screen.getByText('student.playWithClass.joinNow')).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes('student.playWithClass.teacherStarted'))).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes('student.playWithClass.playerCount'))).toBeInTheDocument();
  });

  it('navigates to multiplayer with autoCreate when no active game clicked', () => {
    mockUseActiveClassroomGame.mockReturnValue({ activeGame: null, isConnected: true });
    render(<PlayWithClassButton {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?classroom=true&autoCreate=true');
  });

  it('navigates to multiplayer with game code when active game clicked', () => {
    mockUseActiveClassroomGame.mockReturnValue({
      activeGame: {
        gameCode: 'ABC123',
        teacherName: 'Ms. Smith',
        lessonNames: ['Vocab'],
        playerCount: 3,
      },
      isConnected: true,
    });

    render(<PlayWithClassButton {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?code=ABC123&classroom=true');
  });

  it('passes classroomId to useActiveClassroomGame', () => {
    render(<PlayWithClassButton {...defaultProps} />);
    expect(mockUseActiveClassroomGame).toHaveBeenCalledWith('class-123');
  });
});
