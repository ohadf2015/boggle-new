import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const flag = vi.hoisted(() => ({
  value: null as string | null,
  calls: [] as Array<{ key: string; enabled: boolean }>,
}));

vi.mock('@/hooks/useGrowthRadarFlag', () => ({
  useGrowthRadarFlag: (key: string, enabled = true) => {
    flag.calls.push({ key, enabled });
    return enabled ? flag.value : null;
  },
}));

vi.mock('@/utils/gamesCompletedCount', () => ({
  readGamesCompletedCount: () => 1,
}));

const trackGrowthEvent = vi.hoisted(() => vi.fn());
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

import FirstGameBridge from '../FirstGameBridge';

describe('FirstGameBridge', () => {
  beforeEach(() => {
    flag.value = null;
    flag.calls = [];
    trackGrowthEvent.mockClear();
  });

  it('renders nothing and does not read the flag when the surface is not under test', () => {
    const { container } = render(
      <FirstGameBridge surface="singleplayer" enabled={false} onActivate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(flag.calls.every((c) => c.enabled === false)).toBe(true);
  });

  it('keeps today\'s screen when Growth Radar serves control', () => {
    flag.value = 'control';
    const { container } = render(
      <FirstGameBridge surface="singleplayer" enabled onActivate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('first-game-bridge')).toBeNull();
  });

  it('one tap fires growth:next_game_picked and the parent navigation, with no dialog of its own', () => {
    flag.value = 'bridge';
    const onActivate = vi.fn();
    render(<FirstGameBridge surface="classic-mp" enabled onActivate={onActivate} />);
    const button = screen.getByTestId('first-game-bridge');
    expect(button).toHaveAttribute('data-to', 'word-wheel');
    expect(button).toHaveTextContent('results.firstGameBridge.wordWheel');
    fireEvent.click(button);
    expect(trackGrowthEvent).toHaveBeenCalledWith('next_game_picked', {
      from_mode: 'classic-mp',
      to_mode: 'word-wheel',
      first_session: true,
      experiment: 'first-game-bridge',
      variant: 'bridge',
    });
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('tells the parent when the treatment is holding the screen', () => {
    flag.value = 'bridge';
    const onHoldingChange = vi.fn();
    render(
      <FirstGameBridge surface="singleplayer" enabled onActivate={vi.fn()} onHoldingChange={onHoldingChange} />,
    );
    expect(onHoldingChange).toHaveBeenCalledWith(true);
  });
});
