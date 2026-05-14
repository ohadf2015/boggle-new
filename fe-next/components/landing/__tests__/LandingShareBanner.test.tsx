import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingShareBanner } from '../LandingShareBanner';

let mockIsAuthenticated = false;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('LandingShareBanner', () => {
  const onShareClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated = false;
  });

  it('should render the share button', () => {
    render(<LandingShareBanner onShareClick={onShareClick} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should show landing.shareTitle text', () => {
    render(<LandingShareBanner onShareClick={onShareClick} />);
    expect(screen.getByText('landing.shareTitle')).toBeInTheDocument();
  });

  it('should call onShareClick when button is clicked', () => {
    render(<LandingShareBanner onShareClick={onShareClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onShareClick).toHaveBeenCalledTimes(1);
  });

  it('should show auth subtitle (landing.shareSubtitle) when authenticated', () => {
    mockIsAuthenticated = true;
    render(<LandingShareBanner onShareClick={onShareClick} />);
    expect(screen.getByTestId('banner-subtitle')).toHaveTextContent('landing.shareSubtitle');
  });

  it('should show guest subtitle (landing.shareSubtitleGuest) when not authenticated', () => {
    mockIsAuthenticated = false;
    render(<LandingShareBanner onShareClick={onShareClick} />);
    expect(screen.getByTestId('banner-subtitle')).toHaveTextContent('landing.shareSubtitleGuest');
  });
});
