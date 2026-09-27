/**
 * WordOfTheDay tests
 * Tests: renders word, renders definition, correct test IDs, uses translations
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordOfTheDay } from '../WordOfTheDay';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} data-testid="motion-div" {...rest}>{children}</div>
    ),
    span: ({ children, className, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
      <span className={className} data-testid="motion-span" {...rest}>{children}</span>
    ),
  },
  useReducedMotion: vi.fn().mockReturnValue(false),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'education.wordOfTheDay.title': 'Word of the Day',
        'education.wordOfTheDay.learnMore': 'Learn More',
      };
      return map[key] || key;
    },
  }),
}));

vi.mock('lucide-react', () => ({
  Star: (props: React.SVGAttributes<SVGElement>) => <svg data-testid="star-icon" {...props} />,
}));

describe('WordOfTheDay', () => {
  it('renders the word text', () => {
    render(<WordOfTheDay word="ephemeral" />);
    const wordEl = screen.getByTestId('wotd-word');
    expect(wordEl.textContent).toBe('ephemeral');
  });

  it('renders definition when provided', () => {
    render(<WordOfTheDay word="ephemeral" definition="lasting a very short time" />);
    expect(screen.getByText('lasting a very short time')).toBeInTheDocument();
  });

  it('does not render definition when not provided', () => {
    render(<WordOfTheDay word="ephemeral" />);
    expect(screen.queryByTestId('wotd-definition')).not.toBeInTheDocument();
  });

  it('has correct test IDs', () => {
    render(<WordOfTheDay word="test" definition="a test" />);
    expect(screen.getByTestId('wotd-card')).toBeInTheDocument();
    expect(screen.getByTestId('wotd-word')).toBeInTheDocument();
    expect(screen.getByTestId('wotd-definition')).toBeInTheDocument();
  });

  it('renders translated title', () => {
    render(<WordOfTheDay word="test" />);
    expect(screen.getByText('Word of the Day')).toBeInTheDocument();
  });

  it('renders star icon', () => {
    render(<WordOfTheDay word="test" />);
    expect(screen.getByTestId('star-icon')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(<WordOfTheDay word="test" className="my-class" />);
    expect(screen.getByTestId('wotd-card')).toHaveClass('my-class');
  });
});
