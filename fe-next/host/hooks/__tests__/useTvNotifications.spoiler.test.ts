import { vi, type Mock, } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTvNotifications } from '../useTvNotifications';

// Mock TvNotification imports
vi.mock('../../components/tv-broadcast/TvNotification', () => ({
  NOTIFICATION_LAYOUTS: {
    rare_word: 'left-mascot',
    epic_word: 'left-mascot',
    long_word: 'left-mascot',
    word_snipe: 'center-highlight',
    first_blood: 'center-highlight',
    combo_5x: 'left-mascot',
    combo_10x: 'left-mascot',
    combo_15x: 'left-mascot',
    combo_20x: 'left-mascot',
    combo_broken: 'left-mascot',
    overtake: 'left-mascot',
    comeback: 'center-highlight',
    photo_finish: 'center-highlight',
    achievement: 'left-mascot',
    level_up: 'left-mascot',
    fire_round_start: 'center-highlight',
    fire_round_end: 'left-mascot',
    final_warning: 'center-highlight',
    earthquake: 'center-highlight',
  },
  NOTIFICATION_MASCOTS: {
    rare_word: 'excited',
    epic_word: 'excited',
    long_word: 'happy',
    word_snipe: 'surprised',
    first_blood: 'excited',
    combo_5x: 'happy',
    combo_10x: 'excited',
    combo_15x: 'excited',
    combo_20x: 'excited',
    combo_broken: 'sad',
    overtake: 'happy',
    comeback: 'excited',
    photo_finish: 'surprised',
    achievement: 'excited',
    level_up: 'happy',
    fire_round_start: 'excited',
    fire_round_end: 'neutral',
    final_warning: 'worried',
    earthquake: 'worried',
  },
}));

describe('useTvNotifications - anti-spoiler', () => {
  const createMockSocket = () => {
    const handlers: Record<string, Function> = {};
    return {
      on: vi.fn((event: string, handler: Function) => {
        handlers[event] = handler;
      }),
      off: vi.fn(),
      _trigger: (event: string, data: any) => {
        handlers[event]?.(data);
      },
    };
  };

  const mockT = (key: string, params?: Record<string, string | number>) => {
    if (params) {
      let result = key;
      for (const [k, v] of Object.entries(params)) {
        result += `|${k}=${v}`;
      }
      return result;
    }
    return key;
  };

  it('word notifications do not contain the actual word text', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() =>
      useTvNotifications({ socket: socket as any, enabled: true, t: mockT })
    );

    // Trigger startGame first so firstWordFound logic works
    act(() => socket._trigger('startGame', {}));

    // Trigger a long word
    act(() => {
      socket._trigger('playerFoundWordBatch', {
        words: [{ username: 'player1', wordCount: 1, word: 'EXTRALONG', score: 100 }],
      });
    });

    const notifs = result.current.notifications;
    // Should have notifications but none should contain the actual word
    for (const n of notifs) {
      expect(n.subtext).not.toContain('EXTRALONG');
      expect(n.headline).not.toContain('EXTRALONG');
    }
  });

  it('word notifications contain letter count', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() =>
      useTvNotifications({ socket: socket as any, enabled: true, t: mockT })
    );

    act(() => socket._trigger('startGame', {}));
    act(() => {
      socket._trigger('playerFoundWordBatch', {
        words: [{ username: 'player1', wordCount: 1, word: 'STUNNING', score: 80 }],
      });
    });

    const wordNotifs = result.current.notifications.filter(
      n => n.type === 'rare_word' || n.type === 'epic_word' || n.type === 'long_word'
    );
    expect(wordNotifs.length).toBeGreaterThan(0);
    // subtext should reference letter count (8 letters for STUNNING)
    for (const n of wordNotifs) {
      expect(n.subtext).toContain('count=8');
    }
  });

  it('word snipe notification does not reveal the word', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() =>
      useTvNotifications({ socket: socket as any, enabled: true, t: mockT })
    );

    act(() => socket._trigger('startGame', {}));

    // Player 1 finds a word
    act(() => {
      socket._trigger('playerFoundWordBatch', {
        words: [{ username: 'player1', wordCount: 1, word: 'SECRET', score: 50 }],
      });
    });

    // Player 2 finds the same word within 2s (snipe)
    act(() => {
      socket._trigger('playerFoundWordBatch', {
        words: [{ username: 'player2', wordCount: 1, word: 'SECRET', score: 50 }],
      });
    });

    const snipeNotifs = result.current.notifications.filter(n => n.type === 'word_snipe');
    expect(snipeNotifs.length).toBeGreaterThan(0);
    for (const n of snipeNotifs) {
      expect(n.subtext).not.toContain('SECRET');
      expect(n.subtext).toContain('length=6');
    }
  });
});
