import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BlastView from '../BlastView';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => vi.fn(),
}));
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ unlockAudio: vi.fn() }),
}));
vi.mock('@/components/ui/PlayfulBackground', () => ({
  PlayfulBackground: () => null,
}));
vi.mock('../BlastGame', () => ({
  BlastGame: () => <div data-testid="blast-game" />,
}));
vi.mock('../BlastReadyScreen', () => ({
  BlastReadyScreen: ({ onStart }: { onStart: () => void }) => (
    <div data-testid="blast-ready-screen">
      <button onClick={() => onStart()}>play</button>
    </div>
  ),
}));
vi.mock('../BlastWaveIntro', () => ({
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

  it('transitions directly to BlastGame after clicking play (wave 1 skips intro)', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByText('play'));
    expect(screen.queryByTestId('blast-ready-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('blast-game')).toBeInTheDocument();
  });

  it('always uses medium difficulty config', () => {
    // BlastView should not accept or pass difficulty — it hardcodes medium
    render(<BlastView />);
    fireEvent.click(screen.getByText('play'));
    // Game renders — confirms no difficulty selection needed
    expect(screen.getByTestId('blast-game')).toBeInTheDocument();
  });
});
