/**
 * @jest-environment jsdom
 */

// Mock framer-motion BEFORE imports (hoisted)
jest.mock('framer-motion', () => {
  const React = require('react');
  const FRAMER_PROPS = [
    'initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap',
    'whileInView', 'viewport', 'layout', 'layoutId', 'drag', 'dragConstraints',
    'dragElastic', 'dragMomentum', 'dragTransition', 'onDrag', 'onDragStart',
    'onDragEnd', 'variants', 'custom'
  ];

  return {
    motion: new Proxy({}, {
      get: (_target, prop) => {
        const Component = React.forwardRef(({ children, ...props }: any, ref: any) => {
          const htmlProps = { ...props };
          FRAMER_PROPS.forEach(frameProp => delete htmlProps[frameProp]);
          return React.createElement(prop as string, { ...htmlProps, ref }, children);
        });
        Component.displayName = `motion.${String(prop)}`;
        return Component;
      }
    }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ScrambledChallenge from '../ScrambledChallenge';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock translations
jest.mock('@/contexts/LanguageContext', () => ({
  ...jest.requireActual('@/contexts/LanguageContext'),
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'buzz.type.scrambled': 'SCRAMBLED',
        'buzz.hint': 'HINT',
        'buzz.yourAnswer': 'YOUR ANSWER',
        'buzz.submit': 'SUBMIT',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

describe('ScrambledChallenge', () => {
  const mockChallenge = {
    prompt: 'Unscramble: TSET',
    answer: 'TEST',
    hint: 'Four letter word for examination',
    trendingContext: 'Related to trending topic: Education',
  };

  const mockOnAnswer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the challenge prompt', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Unscramble: TSET')).toBeInTheDocument();
    expect(screen.getByText('SCRAMBLED')).toBeInTheDocument();
  });

  it('shows hint when showHint is true', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={true}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('HINT')).toBeInTheDocument();
    expect(screen.getByText('Four letter word for examination')).toBeInTheDocument();
  });

  it('does not show hint when showHint is false', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    expect(screen.queryByText('HINT')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Four letter word for examination')
    ).not.toBeInTheDocument();
  });

  it('converts input to uppercase', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText('YOUR ANSWER') as HTMLInputElement;

    await user.type(input, 'test');

    expect(input.value).toBe('TEST');
  });

  it('calls onAnswer with user input when submit button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText('YOUR ANSWER');
    const submitButton = screen.getByText('SUBMIT');

    await user.type(input, 'TEST');
    await user.click(submitButton);

    expect(mockOnAnswer).toHaveBeenCalledWith('TEST');
  });

  it('submit button is disabled when input is empty', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const submitButton = screen.getByText('SUBMIT');

    expect(submitButton).toBeDisabled();
  });

  it('submit button is enabled when input has text', async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText('YOUR ANSWER');
    const submitButton = screen.getByText('SUBMIT');

    await user.type(input, 'TEST');

    expect(submitButton).not.toBeDisabled();
  });

  it('shows trending context when provided', () => {
    render(
      <LanguageProvider>
        <ScrambledChallenge
          challenge={mockChallenge}
          onAnswer={mockOnAnswer}
          showHint={false}
        />
      </LanguageProvider>
    );

    expect(
      screen.getByText('Related to trending topic: Education')
    ).toBeInTheDocument();
  });
});
