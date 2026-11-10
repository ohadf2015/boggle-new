import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, within, cleanup } from '@testing-library/react';
import { ingestLessonClaimsRound, ingestLessonClaim } from '@/components/education/live/useLessonClaims';
import { ProjectorLessonClaims } from '../ProjectorLessonClaims';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

const slots = (n: number) => Array.from({ length: n }, (_, index) => ({ index, first: 'ABCDEFGHIJKL'[index], length: 5, claim: null }));

describe('ProjectorLessonClaims', () => {
  afterEach(() => {
    cleanup();
    act(() => ingestLessonClaimsRound({}));
  });

  it('Given no race this round, When the projector renders, Then the board is absent', () => {
    const { container } = render(<ProjectorLessonClaims t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given 12 lesson words, When the round starts, Then all 12 show masked with the claimed count', () => {
    act(() => ingestLessonClaimsRound({ lessonClaims: { roundId: 4, total: 12, claimedCount: 0, slots: slots(12) } }));
    render(<ProjectorLessonClaims t={t} />);
    const board = screen.getByTestId('projector-lesson-claims');
    expect(board).toHaveTextContent('education.race.claimedCount:{"claimed":0,"total":12}');
    const items = within(board).getAllByRole('listitem');
    expect(items).toHaveLength(12);
    expect(items.every((i) => i.getAttribute('data-state') === 'hidden')).toBe(true);
  });

  it('Given a student claims a word, When the event lands, Then its slot flips to the word with their avatar and name', () => {
    act(() => ingestLessonClaimsRound({ lessonClaims: { roundId: 4, total: 2, claimedCount: 0, slots: slots(2) } }));
    render(<ProjectorLessonClaims t={t} />);
    act(() => ingestLessonClaim({ roundId: 4, index: 1, word: 'bloom', username: 'Maya', avatar: { emoji: '🐙' }, teamId: null, claimedCount: 1, total: 2, bonus: 3 }));
    const item = within(screen.getByTestId('projector-lesson-claims')).getAllByRole('listitem')[1];
    expect(item).toHaveAttribute('data-state', 'claimed');
    expect(item).toHaveTextContent('bloom');
    expect(item).toHaveTextContent('Maya');
    expect(item).toHaveTextContent('🐙');
    expect(screen.getByTestId('projector-lesson-claims')).toHaveTextContent('education.race.claimedCount:{"claimed":1,"total":2}');
  });

  it('Given the projector under the lobby zoom, When sized, Then it fits by container queries, not viewport media queries', () => {
    act(() => ingestLessonClaimsRound({ lessonClaims: { roundId: 4, total: 2, claimedCount: 0, slots: slots(2) } }));
    render(<ProjectorLessonClaims t={t} />);
    const board = screen.getByTestId('projector-lesson-claims');
    expect(board.className).toMatch(/\[container-type:size\]/);
    expect(board.outerHTML).not.toMatch(/\b(sm|md|lg|xl):/);
  });

  it('Given a long and a short word, When the tiles size their text, Then each tile is its own size container and the longer word gets the smaller width share, so neither spills out of its tile', () => {
    const words = [{ index: 0, first: 'T', length: 11, claim: null }, { index: 1, first: 'A', length: 4, claim: null }];
    act(() => ingestLessonClaimsRound({ lessonClaims: { roundId: 4, total: 2, claimedCount: 0, slots: words } }));
    render(<ProjectorLessonClaims t={t} />);
    const faces = screen.getAllByTestId('claim-tile-face');
    expect(faces.every((f) => /\[container-type:size\]/.test(f.className))).toBe(true);
    const share = (el: HTMLElement) => Number(/([\d.]+)cqw/.exec(el.querySelector('[data-testid=claim-tile-text]')!.getAttribute('style') ?? '')?.[1]);
    expect(share(faces[0])).toBeLessThan(share(faces[1]));
  });
});
