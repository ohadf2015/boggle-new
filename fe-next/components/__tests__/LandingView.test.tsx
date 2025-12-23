/**
 * LandingView Component Tests
 * 
 * Tests for the main landing page component
 */

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: jest.fn(() => ({
    playTrack: jest.fn(),
    stopMusic: jest.fn(),
    TRACKS: { LOBBY: 'lobby' },
    currentTrack: null,
    isPlaying: false,
  })),
}));

jest.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="header">Header</header>,
}));

jest.mock('@/components/SocialProof', () => ({
  __esModule: true,
  default: () => <div data-testid="social-proof">Social Proof</div>,
}));

jest.mock('../landing/ModeCard', () => ({
  __esModule: true,
  default: ({ title, href }: { title: string; href: string }) => (
    <a href={href} data-testid={`mode-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {title}
    </a>
  ),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <p {...props}>{children}</p>
    ),
  },
}));

jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import LandingView from '../landing/LandingView';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';

const mockPlayTrack = jest.fn();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>
    {children}
  </LanguageProvider>
);

describe('LandingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMusic as jest.Mock).mockReturnValue({
      playTrack: mockPlayTrack,
      stopMusic: jest.fn(),
      TRACKS: { LOBBY: 'lobby' },
      currentTrack: null,
      isPlaying: false,
    });
  });

  it('renders game mode selection cards', () => {
    render(<LandingView />, { wrapper: TestWrapper });
    
    const links = screen.getAllByRole('link');
    const hasSinglePlayer = links.some(link => 
      link.getAttribute('href')?.includes('singleplayer')
    );
    const hasMultiplayer = links.some(link => 
      link.getAttribute('href')?.includes('multiplayer')
    );
    
    expect(hasSinglePlayer || hasMultiplayer).toBe(true);
  });

  it('plays lobby music on mount', () => {
    render(<LandingView />, { wrapper: TestWrapper });
    
    expect(mockPlayTrack).toHaveBeenCalledWith('lobby');
  });

  it('has accessible navigation links', () => {
    render(<LandingView />, { wrapper: TestWrapper });
    
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    
    links.forEach(link => {
      expect(link).toHaveAttribute('href');
    });
  });
});
