import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WordTowerVersus } from '../WordTowerVersus';

// Pixi/WebGL-heavy — not renderable under jsdom, and unrelated to reaction
// wiring, so it's stubbed like every other Word Tower test does.
vi.mock('../WordTowerScene', () => ({ WordTowerScene: () => null }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, params?: Record<string, string | number>) => (params ? `${key}:${Object.values(params).join(',')}` : key), dir: 'ltr' }),
}));

const you = {
  tray: ['C', 'A', 'T', 'S', 'X', 'Y', 'Z'],
  anchorLetter: 'C',
  scramblesLeft: 2,
  heightM: 12,
  combo: 0,
  floors: 2,
  bombCharge: 0,
};

let socketHandlers: Record<string, (payload: unknown) => void>;
let emitMock: ReturnType<typeof vi.fn>;

vi.mock('@/lib/wordTower/useWordTowerVersus', () => ({
  useWordTowerVersus: () => ({
    state: { you, standings: [], endsAtMs: 0, selected: [], lastError: null, errorKey: 0, lastBombHit: null, bombKey: 0, resultKey: 0 },
    word: '',
    selectTile: vi.fn(),
    backspace: vi.fn(),
    clear: vi.fn(),
    submit: vi.fn(),
    scramble: vi.fn(),
    sendBomb: vi.fn(),
  }),
}));

function makeSocket() {
  socketHandlers = {};
  emitMock = vi.fn();
  return {
    id: 'sock-1',
    on: vi.fn((event: string, handler: (payload: unknown) => void) => { socketHandlers[event] = handler; }),
    off: vi.fn(),
    emit: emitMock,
  } as unknown as import('socket.io-client').Socket;
}

describe('WordTowerVersus — quick reactions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sending the love reaction emits quickReaction and shows it locally', () => {
    const socket = makeSocket();
    render(<WordTowerVersus socket={socket} username="Me" />);

    fireEvent.click(screen.getByRole('button', { name: 'reactions.label' }));
    fireEvent.click(screen.getByRole('button', { name: 'reactions.love' }));

    expect(emitMock).toHaveBeenCalledWith('quickReaction', { reactionId: 'love', username: 'Me' });
    expect(screen.getByText('Me')).toBeInTheDocument(); // own floating reaction shows immediately
  });

  it('renders an incoming love reaction from a rival', () => {
    const socket = makeSocket();
    render(<WordTowerVersus socket={socket} username="Me" />);

    act(() => {
      socketHandlers['quickReaction']({ reactionId: 'love', username: 'Rival' });
    });

    expect(screen.getByText('Rival')).toBeInTheDocument();
  });
});
