import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => {
  const Btn = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'> & Record<string, unknown>>(
    ({ children, initial, animate, exit, transition, whileTap, ...props }, ref) => (
      <button ref={ref} {...props}>{children}</button>
    ),
  );
  const Div = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'> & Record<string, unknown>>(
    ({ children, initial, animate, exit, transition, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    ),
  );
  const Span = React.forwardRef<HTMLSpanElement, React.ComponentProps<'span'> & Record<string, unknown>>(
    ({ children, initial, animate, exit, transition, ...props }, ref) => (
      <span ref={ref} {...props}>{children}</span>
    ),
  );
  Btn.displayName = 'MotionBtn';
  Div.displayName = 'MotionDiv';
  Span.displayName = 'MotionSpan';
  return {
    m: { button: Btn, div: Div, span: Span },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('../../../../components/RoomChat', () => ({
  __esModule: true,
  default: () => <div data-testid="room-chat" />,
}));

const mockUseCrazyGames = vi.fn();
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => mockUseCrazyGames(),
}));

import { ChatBubble } from '../ChatBubble';

const t = (key: string) => key;

describe('ChatBubble (pre-game host)', () => {
  beforeEach(() => {
    mockUseCrazyGames.mockReset();
  });

  it('renders bubble button when not on CrazyGames', () => {
    mockUseCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: false });
    render(<ChatBubble gameCode="ABCD" username="alice" isHost t={t} />);
    expect(screen.getByLabelText('chat.title')).toBeTruthy();
  });

  it('hides bubble when on CrazyGames platform', () => {
    mockUseCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: true });
    const { container } = render(<ChatBubble gameCode="ABCD" username="alice" isHost t={t} />);
    expect(screen.queryByLabelText('chat.title')).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});
