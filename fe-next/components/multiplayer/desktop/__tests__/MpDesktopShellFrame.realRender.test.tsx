import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MpDesktopShellFrame } from '../MpDesktopShellFrame';

// Render the REAL frame + adapters + rails (no adapter mocks) to prove the live
// data shapes flow through to a [data-mp-shell] tree without throwing. Only the
// i18n context is mocked (so t() returns keys).
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const props = {
  canvas: <div data-testid="canvas">GAME CANVAS</div>,
  leaderboard: [
    { username: 'me', score: 12, wordCount: 4 },
    { username: 'RivalBot', score: 9, wordCount: 3, isBot: true },
  ],
  foundWords: [
    { word: 'cats', score: 6, timestamp: 2000 },
    { word: 'dog', score: 4, timestamp: 1000 },
  ],
  socket: null, // skips the self-subscribing opponent feed
  meId: 'me',
  roomId: 'ROOM',
  remainingTime: 45,
  totalTime: 120,
};

describe('MpDesktopShellFrame real render (frame + adapter + rails)', () => {
  it.each(['classic', 'blast', 'word-hunt', 'wheel-rush'])(
    '%s mode renders the real shell with the canvas',
    (mode) => {
      const { container } = render(<MpDesktopShellFrame {...(props as any)} gameMode={mode} />);
      expect(container.querySelector('[data-mp-shell]')).toBeInTheDocument();
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    },
  );

  it('classic: surfaces mapped roster + found words in the rails', () => {
    render(<MpDesktopShellFrame {...(props as any)} gameMode="classic" />);
    // roster rival + my found words visible somewhere in the shell
    expect(screen.getAllByText(/cats/i).length).toBeGreaterThan(0);
  });
});
