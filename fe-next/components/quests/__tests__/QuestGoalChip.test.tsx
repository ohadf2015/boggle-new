import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { useDailyMissions, useAuth } = vi.hoisted(() => ({ useDailyMissions: vi.fn(), useAuth: vi.fn() }));
vi.mock('@/hooks/useDailyMissions', () => ({ useDailyMissions }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

import { QuestGoalChip, questFitsScreen } from '../QuestGoalChip';

const m = (over: Record<string, unknown> = {}) => ({
  slot: 0, questId: 'q', type: 'longWord', family: 'skill', target: 6,
  titleKey: 'quests.daily.q.title', descKey: 'quests.daily.q.desc', icon: 'x',
  completed: false, href: '/daily', ...over,
});

describe('questFitsScreen', () => {
  it('hunt takes longWord / wordsInGame / playMode word-hunt only', () => {
    expect(questFitsScreen(m({ type: 'longWord' }) as never, 'hunt')).toBe(true);
    expect(questFitsScreen(m({ type: 'wordsInGame' }) as never, 'hunt')).toBe(true);
    expect(questFitsScreen(m({ type: 'playMode', href: '/daily/word-hunt' }) as never, 'hunt')).toBe(true);
    expect(questFitsScreen(m({ type: 'score' }) as never, 'hunt')).toBe(false);
    expect(questFitsScreen(m({ type: 'towerMetres' }) as never, 'hunt')).toBe(false);
  });
  it('multiplayer takes score / combo / mpWin / beatHuman / longWord / wordsInGame, playMode only for multiplayer', () => {
    for (const type of ['score', 'combo', 'mpWin', 'beatHuman', 'longWord', 'wordsInGame']) {
      expect(questFitsScreen(m({ type }) as never, 'multiplayer')).toBe(true);
    }
    expect(questFitsScreen(m({ type: 'playMode', href: '/multiplayer' }) as never, 'multiplayer')).toBe(true);
    expect(questFitsScreen(m({ type: 'playMode', href: '/daily/word-hunt' }) as never, 'multiplayer')).toBe(false);
    expect(questFitsScreen(m({ type: 'puzzlesSolved' }) as never, 'multiplayer')).toBe(false);
  });
});

describe('QuestGoalChip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'u1' } });
  });

  it('shows the first open quest that fits the screen', () => {
    useDailyMissions.mockReturnValue({
      loading: false,
      missions: [m({ slot: 0, type: 'towerMetres', titleKey: 'tower' }), m({ slot: 1, type: 'longWord', titleKey: 'long' })],
    });
    render(<QuestGoalChip screen="hunt" />);
    expect(screen.getByTestId('quest-goal-chip').textContent).toContain('long');
  });

  it('skips completed quests', () => {
    useDailyMissions.mockReturnValue({
      loading: false,
      missions: [m({ type: 'longWord', completed: true }), m({ slot: 1, type: 'wordsInGame', titleKey: 'words' })],
    });
    render(<QuestGoalChip screen="hunt" />);
    expect(screen.getByTestId('quest-goal-chip').textContent).toContain('words');
  });

  it.each([
    ['nothing fits', { loading: false, missions: [m({ type: 'towerMetres' })] }, { user: { id: 'u1' } }],
    ['all done', { loading: false, missions: [m({ completed: true })] }, { user: { id: 'u1' } }],
    ['still loading', { loading: true, missions: [m()] }, { user: { id: 'u1' } }],
    ['guest', { loading: false, missions: [m()] }, { user: null }],
  ])('renders nothing when %s', (_n, missions, auth) => {
    useDailyMissions.mockReturnValue(missions);
    useAuth.mockReturnValue(auth);
    const { container } = render(<QuestGoalChip screen="hunt" />);
    expect(container.firstChild).toBeNull();
  });
});
