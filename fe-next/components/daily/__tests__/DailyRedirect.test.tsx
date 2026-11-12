import { act, render as rtlRender, screen } from '@testing-library/react';
import DailyRedirect from '../DailyRedirect';
import * as storage from '@/utils/dailyChallenge/storage';

const replace = vi.fn();
const push = vi.fn();
const landingMounts = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace, push })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/components/Header', () => ({ default: () => <div>HEADER</div> }));
vi.mock('../DailyChallengeLanding', () => ({
  DailyChallengeLanding: () => {
    landingMounts();
    return <div data-testid="daily-landing">LANDING</div>;
  },
}));

vi.mock('@/hooks/useDailyRivalChallenge', () => ({
  useDailyRivalChallenge: vi.fn(),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasEverPlayedWordWheel: vi.fn(() => false),
  hasEverPlayedWordHunt: vi.fn(() => false),
  hasPlayedWordWheelToday: vi.fn(() => false),
}));

function render(ui: React.ReactElement) {
  const result = rtlRender(ui);
  act(() => { vi.runAllTimers(); });
  return result;
}

const WHEEL_URL = '/en/daily/word-wheel?start=1';

describe('DailyRedirect', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockClear();
    push.mockClear();
    landingMounts.mockClear();
    window.history.replaceState(null, '', '/en/daily');
    sessionStorage.clear();
    vi.mocked(storage.hasEverPlayedWordWheel).mockReturnValue(false);
    vi.mocked(storage.hasEverPlayedWordHunt).mockReturnValue(false);
    vi.mocked(storage.hasPlayedWordWheelToday).mockReturnValue(false);
  });

  it('shows the hub to a first-time player', () => {
    render(<DailyRedirect />);
    expect(screen.getByTestId('daily-landing')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends a returning wheel player straight into today\'s wheel', () => {
    vi.mocked(storage.hasEverPlayedWordWheel).mockReturnValue(true);
    render(<DailyRedirect />);
    expect(replace).toHaveBeenCalledWith(WHEEL_URL);
    expect(landingMounts).not.toHaveBeenCalled();
  });

  it('sends a returning Word Hunt player straight into today\'s wheel', () => {
    vi.mocked(storage.hasEverPlayedWordHunt).mockReturnValue(true);
    render(<DailyRedirect />);
    expect(replace).toHaveBeenCalledWith(WHEEL_URL);
  });

  it('shows the hub when today\'s wheel is already done', () => {
    vi.mocked(storage.hasEverPlayedWordWheel).mockReturnValue(true);
    vi.mocked(storage.hasPlayedWordWheelToday).mockReturnValue(true);
    render(<DailyRedirect />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('daily-landing')).toBeInTheDocument();
  });

  it('shows the hub on the second visit in a session, so leaving the wheel does not loop back', () => {
    vi.mocked(storage.hasEverPlayedWordWheel).mockReturnValue(true);
    const { unmount } = render(<DailyRedirect />);
    unmount();
    replace.mockClear();
    render(<DailyRedirect />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('daily-landing')).toBeInTheDocument();
  });

  it('falls back to a hard redirect when the app router is not initialized yet', () => {
    vi.mocked(storage.hasEverPlayedWordWheel).mockReturnValue(true);
    replace.mockImplementationOnce(() => { throw new Error('Router action dispatched before initialization.'); });
    const hardReplace = vi.fn();
    vi.stubGlobal('location', { search: '', replace: hardReplace });
    render(<DailyRedirect />);
    vi.unstubAllGlobals();
    expect(hardReplace).toHaveBeenCalledWith(WHEEL_URL);
  });

  it('shows the hub when the session marker cannot be written', () => {
    vi.mocked(storage.hasEverPlayedWordWheel).mockReturnValue(true);
    const setItem = vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    render(<DailyRedirect />);
    setItem.mockRestore();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('daily-landing')).toBeInTheDocument();
  });

  it('keeps the hub for a rival challenge link', () => {
    vi.mocked(storage.hasEverPlayedWordWheel).mockReturnValue(true);
    window.history.replaceState(null, '', '/en/daily?whName=Bo&whEmoji=x&whScore=9&whPuzzle=3');
    render(<DailyRedirect />);
    expect(replace).not.toHaveBeenCalled();
  });
});
