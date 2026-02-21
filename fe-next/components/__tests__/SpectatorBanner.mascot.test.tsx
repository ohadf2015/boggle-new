import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
  },
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

jest.mock('lucide-react', () => ({
  Eye: () => <svg data-testid="eye-icon" />,
  Users: () => <svg data-testid="users-icon" />,
}));

import SpectatorBanner from '../SpectatorBanner';

describe('SpectatorBanner - spectating mascot', () => {
  it('renders spectating mascot in the banner', () => {
    render(
      <SpectatorBanner
        isSpectating={true}
        t={(k: string) => k}
      />
    );
    expect(screen.getByTestId('mascot-spectating')).toBeInTheDocument();
  });

  it('does not render mascot when not spectating', () => {
    render(
      <SpectatorBanner
        isSpectating={false}
        t={(k: string) => k}
      />
    );
    expect(screen.queryByTestId('mascot-spectating')).not.toBeInTheDocument();
  });
});
