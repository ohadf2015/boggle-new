/**
 * GlobalCoinEarnFx — the single owner of the coin-reward moment. Listens to
 * `lexiclash:coin-earned`, plans the moment once (planCoinReward), then fires:
 * an ascending coin-chime arpeggio (always), flying coins (WebGL/DOM/none by
 * mode), and the CoinRewardHud counter (ALWAYS, even under reduced motion —
 * it's the a11y replacement for the retired toast).
 *
 * `rand` is injected so the casino surprise-jackpot roll is deterministic here.
 */
import { render, screen, act, waitFor } from '@testing-library/react';

const {
  playCoinCollectMock, playCoinCascadeMock, spawnCoinStreamMock,
  isInitializedMock, isNativeMock, reducedMock, coinsMock, calmMock,
} = vi.hoisted(() => ({
  playCoinCollectMock: vi.fn(),
  playCoinCascadeMock: vi.fn(),
  spawnCoinStreamMock: vi.fn(),
  isInitializedMock: vi.fn(() => true),
  isNativeMock: vi.fn(() => false),
  reducedMock: vi.fn(() => false),
  coinsMock: vi.fn(() => 5000),
  calmMock: vi.fn(() => 'full'),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playCoinCollectSound: playCoinCollectMock,
    playCoinCascadeSound: playCoinCascadeMock,
  }),
}));

vi.mock('@/lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: {
    spawnCoinStream: spawnCoinStreamMock,
    isInitialized: () => isInitializedMock(),
  },
}));

vi.mock('@/utils/platform', () => ({ isNative: () => isNativeMock() }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => reducedMock() }));
vi.mock('@/contexts/CoinContext', () => ({ useCoinContext: () => ({ coins: coinsMock() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useCelebrationIntensity: () => calmMock() }));

import GlobalCoinEarnFx, { COIN_EARNED_EVENT } from '../GlobalCoinEarnFx';
import { COIN_SPENT_EVENT } from '@/utils/coinEarnedFx';

// rand that never triggers the surprise jackpot (first roll high).
const noSurprise = () => 0.99;

function removeExtraChildren() {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
}

function fire(detail: { amount: number; source?: { x: number; y: number } }) {
  act(() => {
    window.dispatchEvent(new CustomEvent(COIN_EARNED_EVENT, { detail }));
  });
}

function fireSpent(detail: { amount: number; source?: { x: number; y: number } }) {
  act(() => {
    window.dispatchEvent(new CustomEvent(COIN_SPENT_EVENT, { detail }));
  });
}

function addCounter() {
  const counter = document.createElement('div');
  counter.setAttribute('data-coin-counter', 'true');
  Object.defineProperty(counter, 'getBoundingClientRect', {
    value: () => ({ left: 300, top: 20, width: 40, height: 40, right: 340, bottom: 60, x: 300, y: 20, toJSON: () => ({}) }),
  });
  document.body.appendChild(counter);
}

describe('GlobalCoinEarnFx', () => {
  beforeEach(() => {
    playCoinCollectMock.mockClear();
    playCoinCascadeMock.mockClear();
    spawnCoinStreamMock.mockClear();
    isInitializedMock.mockReturnValue(true);
    isNativeMock.mockReturnValue(false);
    reducedMock.mockReturnValue(false);
    coinsMock.mockReturnValue(5000);
    calmMock.mockReturnValue('full');
    removeExtraChildren();
  });

  it('plays at least one coin-collect chime on a non-jackpot event, no cascade', () => {
    render(<GlobalCoinEarnFx rand={noSurprise} />);
    fire({ amount: 25 });
    expect(playCoinCollectMock).toHaveBeenCalled();
    expect(playCoinCascadeMock).not.toHaveBeenCalled();
  });

  it('chimes ascend in pitch (rate) across the arpeggio', () => {
    vi.useFakeTimers();
    try {
      render(<GlobalCoinEarnFx rand={noSurprise} />);
      fire({ amount: 100 }); // jackpot tier = many chimes
      act(() => { vi.advanceTimersByTime(2000); });
      const rates = playCoinCollectMock.mock.calls.map((c) => c[0]?.rate).filter((r) => typeof r === 'number');
      expect(rates.length).toBeGreaterThan(1);
      for (let i = 1; i < rates.length; i++) {
        expect(rates[i]).toBeGreaterThan(rates[i - 1]);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('plays coin-cascade for jackpot (amount >= 100)', () => {
    render(<GlobalCoinEarnFx rand={noSurprise} />);
    fire({ amount: 250 });
    expect(playCoinCascadeMock).toHaveBeenCalledTimes(1);
  });

  it('surprise jackpot fires on a small amount when the roll hits', () => {
    render(<GlobalCoinEarnFx rand={() => 0.0} />); // first roll 0 → surprise jackpot
    fire({ amount: 5 });
    expect(playCoinCascadeMock).toHaveBeenCalledTimes(1);
  });

  it('ignores events with amount <= 0', () => {
    render(<GlobalCoinEarnFx rand={noSurprise} />);
    fire({ amount: 0 });
    fire({ amount: -5 });
    expect(playCoinCollectMock).not.toHaveBeenCalled();
    expect(spawnCoinStreamMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('coin-reward-hud')).toBeNull();
  });

  it('flies coins via SharedFxApp.spawnCoinStream to the counter when FX active', () => {
    addCounter();
    render(<GlobalCoinEarnFx rand={noSurprise} />);
    fire({ amount: 25, source: { x: 100, y: 400 } });
    expect(spawnCoinStreamMock).toHaveBeenCalledTimes(1);
    const arg = spawnCoinStreamMock.mock.calls[0][0];
    expect(arg.source).toEqual({ x: 100, y: 400 });
    expect(arg.target).toEqual({ x: 320, y: 40 });
    expect(arg.count).toBeGreaterThanOrEqual(4);
  });

  it('renders the CoinRewardHud counter that rolls up to the new total, with +delta', async () => {
    coinsMock.mockReturnValue(5000);
    render(<GlobalCoinEarnFx rand={noSurprise} />);
    fire({ amount: 200 });
    expect(screen.getByTestId('coin-reward-hud')).toBeInTheDocument();
    expect(screen.getByTestId('coin-hud-delta')).toHaveTextContent('+200');
    await waitFor(() => expect(screen.getByTestId('coin-hud-total')).toHaveTextContent('5,000'));
  });

  it('renders the HUD even under reduced motion (toast replacement), no particles', () => {
    reducedMock.mockReturnValue(true);
    render(<GlobalCoinEarnFx rand={noSurprise} />);
    fire({ amount: 50 });
    expect(playCoinCollectMock).toHaveBeenCalled();
    expect(spawnCoinStreamMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dom-coin-burst')).toBeNull();
    expect(screen.getByTestId('coin-reward-hud')).toBeInTheDocument();
  });

  it('renders DOM coin burst on native when WebGL inactive', () => {
    isInitializedMock.mockReturnValue(false);
    isNativeMock.mockReturnValue(true);
    render(<GlobalCoinEarnFx rand={noSurprise} />);
    fire({ amount: 50 });
    expect(screen.getByTestId('dom-coin-burst')).toBeInTheDocument();
  });

  it('suppresses jackpot flair under calm mode but still shows the HUD', () => {
    calmMock.mockReturnValue('calm');
    render(<GlobalCoinEarnFx rand={noSurprise} />);
    fire({ amount: 250 }); // jackpot
    expect(screen.getByTestId('coin-reward-hud')).toBeInTheDocument();
    expect(screen.queryByTestId('coin-hud-jackpot')).toBeNull();
  });

  it('falls back to viewport-top-right when no counter present', () => {
    render(<GlobalCoinEarnFx rand={noSurprise} />);
    fire({ amount: 25 });
    const arg = spawnCoinStreamMock.mock.calls[0][0];
    expect(arg.target.x).toBe(window.innerWidth - 40);
    expect(arg.target.y).toBe(40);
  });

  // --- spend (reversed) ---

  describe('spend (reversed)', () => {
    it('plays a coin chime + rolls the HUD down with a -delta, never cascade', () => {
      coinsMock.mockReturnValue(800);
      render(<GlobalCoinEarnFx rand={noSurprise} />);
      fireSpent({ amount: 200 });
      expect(playCoinCollectMock).toHaveBeenCalled();
      expect(playCoinCascadeMock).not.toHaveBeenCalled();
      expect(screen.getByTestId('coin-reward-hud')).toBeInTheDocument();
      expect(screen.getByTestId('coin-hud-delta')).toHaveTextContent('-200');
    });

    it('flies coins FROM the counter TO the spend source', () => {
      addCounter(); // counter centre (320, 40)
      render(<GlobalCoinEarnFx rand={noSurprise} />);
      fireSpent({ amount: 50, source: { x: 100, y: 500 } });
      expect(spawnCoinStreamMock).toHaveBeenCalledTimes(1);
      const arg = spawnCoinStreamMock.mock.calls[0][0];
      expect(arg.source).toEqual({ x: 320, y: 40 });
      expect(arg.target).toEqual({ x: 100, y: 500 });
    });

    it('never fires the jackpot flair or cascade, even on a would-be surprise', () => {
      render(<GlobalCoinEarnFx rand={() => 0.0} />);
      fireSpent({ amount: 5 });
      expect(screen.queryByTestId('coin-hud-jackpot')).toBeNull();
      expect(playCoinCascadeMock).not.toHaveBeenCalled();
    });

    it('ignores spend events with amount <= 0', () => {
      render(<GlobalCoinEarnFx rand={noSurprise} />);
      fireSpent({ amount: 0 });
      expect(playCoinCollectMock).not.toHaveBeenCalled();
      expect(screen.queryByTestId('coin-reward-hud')).toBeNull();
    });
  });
});
