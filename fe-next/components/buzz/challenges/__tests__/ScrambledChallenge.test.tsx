/**
 * @jest-environment jsdom
 */

// Mock framer-motion BEFORE imports
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, viewport, layout, layoutId, drag, dragConstraints, dragElastic, dragMomentum, dragTransition, onDrag, onDragStart, onDragEnd, variants, custom, ...props }: any) => <div {...props}>{children}</div>,
    h2: ({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, viewport, layout, layoutId, drag, dragConstraints, dragElastic, dragMomentum, dragTransition, onDrag, onDragStart, onDragEnd, variants, custom, ...props }: any) => <h2 {...props}>{children}</h2>,
    button: ({ children, initial, animate, exit, transition, whileHover, whileTap, whileInView, viewport, layout, layoutId, drag, dragConstraints, dragElastic, dragMomentum, dragTransition, onDrag, onDragStart, onDragEnd, variants, custom, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

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

    const input = screen.getByPlaceholderText('YOUR ANSWER');

    await user.type(input, 'test');

    expect(input).toHaveValue('TEST');
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

    await user.type(input, 'test');    
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

    await user.type(input, 'test');

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
