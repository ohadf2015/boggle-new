/**
 * Phone round frame: the board sits right under the HUD; my words, callouts and
 * the class economy strip live in the tray UNDER the board (thumb zone), never
 * over the board or each other.
 */
import React, { memo } from 'react';
import { render, screen, act } from '@testing-library/react';

const { sounds, reduce } = vi.hoisted(() => ({
  sounds: {
    playTimerHeartbeatSound: vi.fn(),
    playLeadChangeSound: vi.fn(),
    playComboSound: vi.fn(),
    playOpponentScoredSound: vi.fn(),
  },
  reduce: { value: false },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sounds }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => reduce.value }));
vi.mock('@/components/ui/CircularTimer', () => ({ default: () => <div data-testid="ring" /> }));
vi.mock('@/components/ui/AnimatedCounter', () => ({ default: ({ value }: { value: number }) => <span data-testid="counter">{value}</span> }));
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));
const { mute, registered } = vi.hoisted(() => ({
  mute: { allMuted: false, toggle: vi.fn(), label: 'Mute', title: 'Mute' },
  registered: { count: 0 },
}));
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => mute }));
vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: () => { registered.count += 1; },
}));

const { wide } = vi.hoisted(() => ({ wide: { value: false } }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => wide.value }));

import { MpRoundLayout, type MpRoundLayoutProps } from '../MpRoundLayout';
import { MpRoundTraySlot, MpTrayNudge } from '../MpRoundTray';
import { resetMpFeedback } from '@/lib/multiplayer/mpFeedback';

const Canvas = memo(function Canvas() {
  return (
    <div data-testid="canvas">
      <MpTrayNudge><div data-testid="stuck-coach">try a word</div></MpTrayNudge>
      <div data-testid="board">board</div>
      <MpRoundTraySlot />
    </div>
  );
});

function props(over: Partial<MpRoundLayoutProps> = {}): MpRoundLayoutProps {
  return {
    meId: 'me',
    gameMode: 'classic',
    remainingTime: 60,
    totalTime: 60,
    leaderboard: [{ username: 'me', score: 4 }, { username: 'amy', score: 0 }],
    users: [{ username: 'me' }, { username: 'amy' }],
    foundWords: [{ word: 'cat', score: 4 }, { word: 'dog', score: 4 }],
    comboLevel: 0,
    revealed: true,
    onExit: vi.fn(),
    canvas: <Canvas />,
    dock: <div data-testid="economy-dock">cash</div>,
    ...over,
  };
}

describe('MpRoundLayout phone tray', () => {
  beforeEach(() => { act(() => resetMpFeedback()); wide.value = false; });

  it('GIVEN a phone WHEN the board mode has a tray slot THEN my words and the callouts render under the board, not over it', () => {
    render(<MpRoundLayout {...props()} />);
    const tray = screen.getByTestId('mp-round-tray');
    expect(tray).toContainElement(screen.getByTestId('mp-recent-words'));
    expect(tray).toContainElement(screen.getByTestId('mp-callout-stage'));
    expect(screen.getByTestId('board').compareDocumentPosition(tray) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('GIVEN a phone WHEN the class economy strip mounts THEN it sits in the same tray, after my words', () => {
    render(<MpRoundLayout {...props()} />);
    const tray = screen.getByTestId('mp-round-tray');
    const dock = screen.getByTestId('economy-dock');
    expect(tray).toContainElement(dock);
    expect(screen.getByTestId('mp-recent-words').compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('GIVEN a phone tray WHEN words are found THEN the count reads once, in the tray (no floating pill on the board)', () => {
    render(<MpRoundLayout {...props()} />);
    expect(screen.queryByTestId('mp-found-pill')).toBeNull();
    expect(screen.getByTestId('mp-round-tray')).toHaveTextContent('mpUi.round.found:{"count":2}');
  });

  it('GIVEN a desktop WHEN the round renders THEN the lanes stay over the board column and the dock sits in the left rail', () => {
    wide.value = true;
    render(<MpRoundLayout {...props()} />);
    expect(screen.queryByTestId('mp-round-tray')).toBeNull();
    expect(screen.getByRole('complementary', { name: 'mpUi.round.players' })).toContainElement(screen.getByTestId('economy-dock'));
  });

  it('GIVEN no combo yet WHEN the phone HUD renders THEN the empty combo bars stay out of the crowded top bar', () => {
    const { rerender } = render(<MpRoundLayout {...props({ comboLevel: 0 })} />);
    expect(screen.getByTestId('mp-combo-meter').className).toContain('max-lg:hidden');
    rerender(<MpRoundLayout {...props({ comboLevel: 2 })} />);
    expect(screen.getByTestId('mp-combo-meter').className).not.toContain('max-lg:hidden');
  });

  it('GIVEN a stuck-player nudge WHEN it shows on a phone THEN it stacks in the tray, never fixed over the board', () => {
    render(<MpRoundLayout {...props()} />);
    expect(screen.getByTestId('mp-round-tray')).toContainElement(screen.getByTestId('stuck-coach'));
    expect(screen.getByTestId('stuck-coach').parentElement?.className).not.toContain('fixed');
  });

  it('GIVEN a phone board view with no tray (Blast) WHEN a classroom student plays THEN the class strip still shows, in its own row under the board', () => {
    const Bare = () => <div data-testid="board">board</div>;
    render(<MpRoundLayout {...props({ canvas: <Bare /> })} />);
    expect(screen.queryByTestId('mp-round-tray')).toBeNull();
    expect(screen.getByTestId('economy-dock')).toBeTruthy();
    expect(screen.getByTestId('mp-round-canvas').compareDocumentPosition(screen.getByTestId('economy-dock')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
