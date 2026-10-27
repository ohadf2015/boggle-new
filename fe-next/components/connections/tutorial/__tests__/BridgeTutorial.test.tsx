import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BridgeTutorial from '../BridgeTutorial';
import { shouldAutoShowTutorial, tutorialPuzzle, markTutorialSeen, TUTORIAL_SEEN_KEY } from '../tutorialGate';
import { dailyResultKey } from '@/lib/connections/dailyResultStore';

const lang = vi.hoisted(() => ({ value: 'en' }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: lang.value, dir: 'ltr', t: (k: string) => k }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playMatchFoundSound: vi.fn(), playErrorSound: vi.fn() }),
}));

function tap(letter: string) {
  fireEvent.click(screen.getAllByRole('button', { name: letter })[0]);
}
function type(word: string) {
  for (const ch of word) tap(ch);
  fireEvent.click(screen.getByRole('button', { name: 'connections.submit' }));
}

describe('BridgeTutorial — learn by doing', () => {
  beforeEach(() => {
    lang.value = 'en';
    window.localStorage.clear();
  });

  it('Given the tutorial, Then it is a real riddle with the game slots and keyboard, explained in at most 3 steps', () => {
    render(<BridgeTutorial onDone={vi.fn()} />);
    expect(screen.getByText('GOLD')).toBeTruthy();
    expect(screen.getByText('POND')).toBeTruthy();
    expect(screen.getAllByTestId('answer-slot')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'connections.submit' })).toBeTruthy();
    expect(screen.getAllByTestId('tutorial-step').length).toBeLessThanOrEqual(3);
  });

  it('Given a wrong answer, Then it says try again and the player keeps going', () => {
    render(<BridgeTutorial onDone={vi.fn()} />);
    type('BOAT');
    expect(screen.getByText('connections.tutorial.tryAgain')).toBeTruthy();
    expect(screen.queryByTestId('tutorial-start')).toBeNull();
  });

  it('Given the right answer, Then the bridge completes and the player is sent to today’s puzzle', () => {
    const onDone = vi.fn();
    render(<BridgeTutorial onDone={onDone} />);
    type('FISH');
    expect(screen.getByTestId('tutorial-solved')).toBeTruthy();
    fireEvent.click(screen.getByTestId('tutorial-start'));
    expect(onDone).toHaveBeenCalled();
  });

  it('Given two misses, Then a "show me" fills the answer so nobody gets stuck', () => {
    render(<BridgeTutorial onDone={vi.fn()} />);
    type('BOAT');
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'connections.submit' })); });
    type('CAKE');
    fireEvent.click(screen.getByTestId('tutorial-show-me'));
    expect(screen.getByTestId('tutorial-solved')).toBeTruthy();
  });

  it('Given a physical keyboard, Then keys reach the tutorial and never the game underneath', () => {
    const gameListener = vi.fn();
    window.addEventListener('keydown', gameListener);
    render(<BridgeTutorial onDone={vi.fn()} />);
    for (const ch of 'fish') fireEvent.keyDown(document.body, { key: ch });
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(screen.getByTestId('tutorial-solved')).toBeTruthy();
    expect(gameListener).not.toHaveBeenCalled();
    window.removeEventListener('keydown', gameListener);
  });

  it('Given skip, Then the tutorial closes', () => {
    const onDone = vi.fn();
    render(<BridgeTutorial onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'tutorial.skip' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('Given Japanese (device IME), Then the riddle takes a text field instead of slots', () => {
    lang.value = 'ja';
    render(<BridgeTutorial onDone={vi.fn()} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: tutorialPuzzle('ja').bridge } });
    fireEvent.click(screen.getByRole('button', { name: 'connections.submit' }));
    expect(screen.getByTestId('tutorial-solved')).toBeTruthy();
  });
});

describe('tutorialGate', () => {
  beforeEach(() => window.localStorage.clear());

  it('Given a first-time player, Then it auto-shows; once marked seen it does not', () => {
    expect(shouldAutoShowTutorial('2026-10-27', 'en')).toBe(true);
    markTutorialSeen();
    expect(window.localStorage.getItem(TUTORIAL_SEEN_KEY)).toBe('1');
    expect(shouldAutoShowTutorial('2026-10-27', 'en')).toBe(false);
  });

  it('Given a player who finished a Word Bridge daily before this shipped, Then it never auto-shows', () => {
    window.localStorage.setItem('connections-daily-played', '2026-09-01');
    expect(shouldAutoShowTutorial('2026-10-27', 'en')).toBe(false);
  });

  it('Given a result already stored for today, Then it never auto-shows', () => {
    window.localStorage.setItem(dailyResultKey('2026-10-27', 'en'), '{"kind":"regular"}');
    expect(shouldAutoShowTutorial('2026-10-27', 'en')).toBe(false);
  });

  it('Given every locale, Then the tutorial riddle comes from that locale’s curated pool', () => {
    for (const l of ['en', 'he', 'es', 'sv', 'ja', 'ru']) {
      expect(tutorialPuzzle(l).id.startsWith(`${l}-`)).toBe(true);
    }
  });
});
