import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { ingestLessonClaimsRound, ingestLessonClaim } from '../useLessonClaims';
import { LessonClaimToast, CLAIM_TOAST_MS } from '../LessonClaimToast';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

function fakeSocket() {
  const handlers = new Map<string, (d: unknown) => void>();
  return {
    emit: vi.fn(),
    on: vi.fn((e: string, fn: (d: unknown) => void) => handlers.set(e, fn)),
    off: vi.fn(),
    fire: (e: string, d: unknown) => handlers.get(e)?.(d),
  };
}

const race = {
  roundId: 4, total: 2, claimedCount: 0,
  slots: [{ index: 0, first: 'P', length: 6, claim: null }, { index: 1, first: 'C', length: 4, claim: null }],
};

const claim = (username: string) => ({
  roundId: 4, index: 0, word: 'photon', username, avatar: { emoji: '🦊' }, teamId: null, claimedCount: 1, total: 2, bonus: 3,
});

describe('LessonClaimToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    act(() => ingestLessonClaimsRound({ lessonClaims: race }));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('Given I claimed a word, When the claim lands, Then I see my claimed burst with the bonus and no reaction tray', () => {
    const socket = fakeSocket();
    render(<LessonClaimToast socket={socket as never} me="noa" t={t} dir="ltr" />);
    act(() => ingestLessonClaim(claim('Noa')));
    expect(screen.getByTestId('lesson-claim-burst')).toHaveTextContent('education.race.youClaimed:{"word":"photon","bonus":3}');
    expect(screen.queryByTestId('lesson-claim-reactions')).not.toBeInTheDocument();
  });

  it('Given a classmate claimed a word, When it lands, Then I see who took it and can react with a fixed emote', () => {
    const socket = fakeSocket();
    render(<LessonClaimToast socket={socket as never} me="Dana" t={t} dir="ltr" />);
    act(() => ingestLessonClaim(claim('Noa')));
    expect(screen.getByTestId('lesson-claim-toast')).toHaveTextContent('education.race.claimedBy:{"name":"Noa","word":"photon"}');
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(socket.emit).toHaveBeenCalledWith('quickReaction', { reactionId: 'fire', username: 'Dana' });
  });

  it('Given a classmate claimed a word, When the toast shows, Then it sits on the HUD at the top and only its emote buttons take touches', () => {
    render(<LessonClaimToast socket={fakeSocket() as never} me="Dana" t={t} dir="ltr" />);
    act(() => ingestLessonClaim(claim('Noa')));
    const wrapper = screen.getByTestId('lesson-claim-toast').parentElement!;
    expect(wrapper.className).toMatch(/\bfixed\b.*\btop-0\b|\btop-0\b.*\bfixed\b/);
    expect(wrapper.className).toMatch(/pointer-events-none/);
    const touchable = [...wrapper.querySelectorAll('*')].filter((el) => /pointer-events-auto/.test(el.className.toString()));
    expect(touchable).toEqual([screen.getByTestId('lesson-claim-reactions')]);
  });

  it('Given a long name and word, When the toast shows on a narrow phone, Then the toast may shrink below its text width so the line truncates instead of spilling off screen', () => {
    render(<LessonClaimToast socket={fakeSocket() as never} me="Dana" t={t} dir="ltr" />);
    act(() => ingestLessonClaim(claim('Maximiliana-Josefina')));
    expect(screen.getByTestId('lesson-claim-toast').className).toMatch(/\bmin-w-0\b/);
    expect(screen.getByTestId('lesson-claim-text').className).toMatch(/\bline-clamp-2\b/);
  });

  it('Given the toast is up, When time passes, Then it leaves on its own', () => {
    render(<LessonClaimToast socket={fakeSocket() as never} me="Dana" t={t} dir="ltr" />);
    act(() => ingestLessonClaim(claim('Noa')));
    act(() => vi.advanceTimersByTime(CLAIM_TOAST_MS + 50));
    expect(screen.queryByTestId('lesson-claim-toast')).not.toBeInTheDocument();
  });

  it('Given a classmate reacts while the toast is up, When the emote arrives, Then it shows inside the toast lane, not over the board', () => {
    const socket = fakeSocket();
    render(<LessonClaimToast socket={socket as never} me="Dana" t={t} dir="ltr" />);
    act(() => ingestLessonClaim(claim('Noa')));
    act(() => socket.fire('quickReaction', { reactionId: 'clap', username: 'Eli' }));
    expect(screen.getByTestId('lesson-claim-toast')).toHaveTextContent('👏');
  });

  it('Given a claim already shown, When the view remounts mid-round (reconnect), Then the old toast does not pop again but the next claim does', () => {
    act(() => ingestLessonClaim(claim('Noa')));
    render(<LessonClaimToast socket={fakeSocket() as never} me="Dana" t={t} dir="ltr" />);
    expect(screen.queryByTestId('lesson-claim-toast')).not.toBeInTheDocument();
    act(() => ingestLessonClaim({ ...claim('Eli'), index: 1, word: 'cell' }));
    expect(screen.getByTestId('lesson-claim-toast')).toHaveTextContent('cell');
  });

  it('Given no race this round, When mounted, Then nothing renders', () => {
    act(() => ingestLessonClaimsRound({}));
    const { container } = render(<LessonClaimToast socket={fakeSocket() as never} me="Dana" t={t} dir="ltr" />);
    expect(container).toBeEmptyDOMElement();
  });
});
