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
jest.mock('../BlastGamePhaser', () => ({
  BlastGamePhaser: () => <div data-testid="blast-game" />,
}));
jest.mock('../BlastReadyScreen', () => ({
  BlastReadyScreen: ({ onStart }: { onStart: (d: string) => void }) => (
    <div data-testid="blast-ready-screen">
      <button onClick={() => onStart('medium')}>play</button>
    </div>
  ),
}));

describe('BlastView ready phase', () => {
  it('renders BlastReadyScreen first (not BlastGame)', () => {
    render(<BlastView />);
    expect(screen.getByTestId('blast-ready-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('blast-game')).not.toBeInTheDocument();
  });

  it('transitions to BlastGame after clicking play', () => {
    render(<BlastView />);
    fireEvent.click(screen.getByText('play'));
    expect(screen.queryByTestId('blast-ready-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('blast-game')).toBeInTheDocument();
  });
});
