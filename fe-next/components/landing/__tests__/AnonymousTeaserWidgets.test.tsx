import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnonymousTeaserWidgets } from '../AnonymousTeaserWidgets';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

describe('AnonymousTeaserWidgets', () => {
  const onSignUpClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three teaser cards (rival, streak, vault)', () => {
    render(<AnonymousTeaserWidgets onSignUpClick={onSignUpClick} />);
    expect(screen.getByTestId('teaser-rival')).toBeInTheDocument();
    expect(screen.getByTestId('teaser-streak')).toBeInTheDocument();
    expect(screen.getByTestId('teaser-vault')).toBeInTheDocument();
  });

  it('marks each teaser as a locked button for a11y', () => {
    render(<AnonymousTeaserWidgets onSignUpClick={onSignUpClick} />);
    const rival = screen.getByTestId('teaser-rival');
    expect(rival).toHaveAttribute('role', 'button');
    expect(rival.getAttribute('aria-label')).toMatch(/landing\.teaser\./);
  });

  it('invokes onSignUpClick when a teaser is clicked', () => {
    render(<AnonymousTeaserWidgets onSignUpClick={onSignUpClick} />);
    fireEvent.click(screen.getByTestId('teaser-rival'));
    expect(onSignUpClick).toHaveBeenCalledTimes(1);
  });

  it('invokes onSignUpClick on Enter key', () => {
    render(<AnonymousTeaserWidgets onSignUpClick={onSignUpClick} />);
    fireEvent.keyDown(screen.getByTestId('teaser-streak'), { key: 'Enter' });
    expect(onSignUpClick).toHaveBeenCalledTimes(1);
  });

  it('invokes onSignUpClick on Space key', () => {
    render(<AnonymousTeaserWidgets onSignUpClick={onSignUpClick} />);
    fireEvent.keyDown(screen.getByTestId('teaser-vault'), { key: ' ' });
    expect(onSignUpClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire on unrelated keys', () => {
    render(<AnonymousTeaserWidgets onSignUpClick={onSignUpClick} />);
    fireEvent.keyDown(screen.getByTestId('teaser-rival'), { key: 'a' });
    expect(onSignUpClick).not.toHaveBeenCalled();
  });

  it('renders the shared sign-in CTA copy', () => {
    render(<AnonymousTeaserWidgets onSignUpClick={onSignUpClick} />);
    // At least one element should reference the shared unlock copy
    expect(screen.getAllByText('landing.teaser.signInToUnlock').length).toBeGreaterThan(0);
  });
});
