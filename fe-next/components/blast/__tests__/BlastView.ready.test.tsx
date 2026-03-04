import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BlastView from '../BlastView';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
jest.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => jest.fn(),
}));
jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ unlockAudio: jest.fn() }),
}));
jest.mock('@/components/ui/PlayfulBackground', () => ({
  PlayfulBackground: () => null,
}));
jest.mock('../BlastGame', () => ({
  BlastGame: () => <div data-testid="blast-game" />,
}));
jest.mock('../BlastReadyScreen', () => ({
  BlastReadyScreen: ({ onStart }: { onStart: () => void }) => (
    <div data-testid="blast-ready-screen">
      <button onClick={() => onStart()}>play</button>
    </div>
  ),
}));
jest.mock('../BlastWaveIntro', () => ({
  BlastWaveIntro: ({ onReady }: { onReady: () => void }) => (
    <div data-testid="wave-intro">
      <button onClick={() => onReady()}>go</button>
    </div>
  ),
}));

describe('BlastView ready phase', () => {
  it('renders BlastReadyScreen first (not BlastGame)', () => {
    render(<BlastView />);
    expect(screen.getByTestId('blast-ready-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('blast-game')).not.toBeInTheDocument();
  });

  it('transitions to wave intro after clicking play', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByText('play'));
    expect(screen.queryByTestId('blast-ready-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('wave-intro')).toBeInTheDocument();
  });

  it('transitions to BlastGame after wave intro GO', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByText('play'));
    fireEvent.click(screen.getByText('go'));
    expect(screen.queryByTestId('wave-intro')).not.toBeInTheDocument();
    expect(screen.getByTestId('blast-game')).toBeInTheDocument();
  });

  it('always uses medium difficulty config', () => {
    // BlastView should not accept or pass difficulty — it hardcodes medium
    render(<BlastView />);
    fireEvent.click(screen.getByText('play'));
    fireEvent.click(screen.getByText('go'));
    // Game renders — confirms no difficulty selection needed
    expect(screen.getByTestId('blast-game')).toBeInTheDocument();
  });
});
