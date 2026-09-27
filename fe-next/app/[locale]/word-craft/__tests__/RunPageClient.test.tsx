import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { RunPageClient } from '../RunPageClient';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => vi.fn() }));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playPerfectWordSound: vi.fn(),
    playSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ fadeToTrack: vi.fn(), stopMusic: vi.fn(), TRACKS: { IN_GAME: 'inGame' } }),
}));
vi.mock('@/lib/word-craft/dictionary', () => ({
  loadWordCraftDictionary: () => Promise.resolve(new Set(['cat', 'cats'])),
}));
vi.mock('@/components/word-craft/WordCraftBoardSection', () => ({
  WordCraftBoardSection: () => <div data-testid="board-section" />,
}));
vi.mock('@/components/word-craft/WordCraftRack', () => ({
  WordCraftRack: () => <div data-testid="rack" />,
}));

describe('RunPageClient', () => {
  it('renders the intro screen first with a start button', async () => {
    render(<RunPageClient />);
    expect(await screen.findByText('wordcraft.run.intro.title')).toBeInTheDocument();
    expect(screen.getByText('wordcraft.run.intro.start')).toBeInTheDocument();
  });

  it('moves to the playing phase when the run starts', async () => {
    render(<RunPageClient />);
    fireEvent.click(await screen.findByText('wordcraft.run.intro.start'));
    expect(await screen.findByTestId('board-section')).toBeInTheDocument();
  });
});
