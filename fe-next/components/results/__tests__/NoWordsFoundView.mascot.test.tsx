import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
    p: ({ children, ...rest }: React.HTMLAttributes<HTMLParagraphElement> & { children?: React.ReactNode }) => (
      <p {...rest}>{children}</p>
    ),
  },
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import NoWordsFoundView from '../NoWordsFoundView';

describe('NoWordsFoundView - crying mascot', () => {
  it('renders crying mascot for the current player', () => {
    render(<NoWordsFoundView isCurrentPlayer={true} playerName="Alice" />);
    expect(screen.getByTestId('mascot-crying')).toBeInTheDocument();
  });

  it('renders crying mascot for other players too', () => {
    render(<NoWordsFoundView isCurrentPlayer={false} playerName="Bob" />);
    expect(screen.getByTestId('mascot-crying')).toBeInTheDocument();
  });
});
