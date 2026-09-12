/**
 * QuickStartButton — live-game start telemetry (WS2).
 *
 * Repeat-last-game is a teacher click path that jumps into classroom-game.
 * We fire edu_live_game_started with source=quick_start so PostHog can
 * quote starts separately from CREATE ROOM.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const trackEduLiveGameStarted = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackEduLiveGameStarted: (...args: unknown[]) => trackEduLiveGameStarted(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import QuickStartButton from '../QuickStartButton';
import type { GameConfiguration } from '@/hooks/useRecentGameSettings';

const config: GameConfiguration = {
  id: 'cfg-1',
  classroomId: 'cls-1',
  classroomName: 'Period 3',
  lessonIds: ['les-1', 'les-2'],
  lessonNames: ['Unit 1', 'Unit 2'],
  settings: { timerMinutes: 3, boardSize: 'medium', allowLateJoin: true },
  savedAt: Date.now(),
};

describe('QuickStartButton telemetry', () => {
  beforeEach(() => {
    trackEduLiveGameStarted.mockClear();
  });

  it('fires edu_live_game_started with source quick_start on click', () => {
    const onClick = vi.fn();
    render(<QuickStartButton config={config} onClick={onClick} />);

    fireEvent.click(screen.getByTestId('quick-start-button'));

    expect(onClick).toHaveBeenCalledWith(config);
    expect(trackEduLiveGameStarted).toHaveBeenCalledWith({
      classroomId: 'cls-1',
      source: 'quick_start',
      lessonCount: 2,
    });
  });

  it('does not fire when there is no config to start', () => {
    const { container } = render(<QuickStartButton config={null} onClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(trackEduLiveGameStarted).not.toHaveBeenCalled();
  });
});
