/**
 * StoryBeatCard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StoryBeatCard } from '../StoryBeatCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'adventure.story.w1.lexi': 'Lexi',
        'adventure.story.w1.after2': 'Welcome to the word realm!',
        'adventure.continue': 'Continue',
      };
      return map[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('framer-motion', () => {
  const components = {
    div: React.forwardRef(function MockDiv({ children, ...props }: any, ref: any) {
      return (
        <div ref={ref} data-testid={props['data-testid']} className={props.className} onClick={props.onClick}>
          {children}
        </div>
      );
    }),
    span: React.forwardRef(function MockSpan({ children, ...props }: any, ref: any) {
      return (
        <span ref={ref} data-testid={props['data-testid']} className={props.className}>
          {children}
        </span>
      );
    }),
    button: React.forwardRef(function MockButton({ children, ...props }: any, ref: any) {
      return (
        <button ref={ref} data-testid={props['data-testid']} className={props.className} onClick={props.onClick}>
          {children}
        </button>
      );
    }),
  };
  return {
    m: components,
    m: components,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('StoryBeatCard', () => {
  const defaultProps = {
    worldId: 1,
    levelNumber: 2,
    characterName: 'Lexi',
    dialogueKey: 'adventure.story.w1.after2',
    isVisible: true,
    onContinue: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it('renders when visible', () => {
    render(<StoryBeatCard {...defaultProps} />);
    expect(screen.getByText('Lexi')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    const { container } = render(<StoryBeatCard {...defaultProps} isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows character name', () => {
    render(<StoryBeatCard {...defaultProps} />);
    expect(screen.getByText('Lexi')).toBeInTheDocument();
  });

  it('reveals dialogue text with typewriter effect', () => {
    render(<StoryBeatCard {...defaultProps} />);
    // Initially partial text
    const dialogueText = 'Welcome to the word realm!';
    // After enough ticks, full text should appear
    act(() => { vi.runAllTimers(); });
    expect(screen.getByText(dialogueText)).toBeInTheDocument();
  });

  it('shows continue button after text completes', () => {
    render(<StoryBeatCard {...defaultProps} />);
    const dialogueText = 'Welcome to the word realm!';
    act(() => { vi.runAllTimers(); });
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('calls onContinue when continue clicked', () => {
    render(<StoryBeatCard {...defaultProps} />);
    const dialogueText = 'Welcome to the word realm!';
    act(() => { vi.runAllTimers(); });
    fireEvent.click(screen.getByText('Continue'));
    expect(defaultProps.onContinue).toHaveBeenCalledTimes(1);
  });
});
