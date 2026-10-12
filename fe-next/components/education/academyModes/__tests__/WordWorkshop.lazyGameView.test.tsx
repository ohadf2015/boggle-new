import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Component, type ReactNode } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playComboSound: vi.fn(), playPerfectWordSound: vi.fn(), playChestOpenSound: vi.fn(), playQuestCompleteSound: vi.fn(), setGameActive: vi.fn() }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGameEnd: vi.fn(), trackGameStart: vi.fn() }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

function gatedGameChunk() {
  let settle = { resolve: () => {}, reject: (_e: Error) => {} };
  const ready = new Promise<void>((resolve, reject) => { settle = { resolve, reject }; });
  vi.doMock('@/components/word-craft/WordCraftGameScreen', async () => {
    await ready;
    return { WordCraftGameView: () => <div data-testid="stub-game-view" /> };
  });
  return settle;
}

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() { return this.state.error ? <div data-testid="route-error">{this.state.error.message}</div> : this.props.children; }
}

const startSession = vi.fn();
beforeEach(() => { vi.resetModules(); startSession.mockReset(); startSession.mockResolvedValue(true); });

const renderIt = async () => {
  const { default: WordWorkshop } = await import('../WordWorkshop');
  return render(
    <Boundary>
      <WordWorkshop lessonName="Weekly" lessonWords={['teacher', 'puzzle']} lessonLanguage="en" onBack={vi.fn()} startSession={startSession} recordResult={vi.fn()} />
    </Boundary>,
  );
};

const play = () => act(async () => { fireEvent.click(screen.getByTestId('workshop-play')); });

describe('WordWorkshop game view loads outside the route bundle', () => {
  it('GIVEN the game chunk still loading WHEN PLAY is tapped THEN a busy placeholder holds the board, then the game mounts', async () => {
    const chunk = gatedGameChunk();
    await renderIt();
    await play();
    expect(screen.getByTestId('workshop-game-loading').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByTestId('stub-game-view')).toBeNull();

    await act(async () => { chunk.resolve(); });
    expect(await screen.findByTestId('stub-game-view')).toBeTruthy();
    expect(screen.queryByTestId('workshop-game-loading')).toBeNull();
  });

  it('GIVEN the game chunk fails to load WHEN PLAY is tapped THEN the route error boundary shows, never a blank board', async () => {
    const chunk = gatedGameChunk();
    await renderIt();
    await act(async () => { chunk.reject(new Error('ChunkLoadError')); });
    await play();
    expect(await screen.findByTestId('route-error')).toBeTruthy();
    expect(screen.queryByTestId('workshop-game')).toBeNull();
  });
});
