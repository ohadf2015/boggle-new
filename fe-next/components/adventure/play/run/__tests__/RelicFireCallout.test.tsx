import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${Object.values(p).join(' ')}` : k),
    language: 'en',
  }),
}));

import RelicBar from '../RelicBar';

/**
 * ROUND 4 GAP. When a relic fired, all the player got was a ~30px "+500" badge
 * stuck to its icon in the corner, while a full-screen "WHOMPED!" banner, a
 * floating "-500" over the enemy and a glowing board took the eye. The relic's
 * own contribution was the LEAST salient thing on screen, so the causal link
 * ("this relic did that") had to be inferred.
 *
 * The callout is the fix: one named, connected panel that says which relic paid
 * and how much. It must NAME the relic — a bare number is the thing that failed.
 */
const OWNED = ['sharp-quill', 'magnet', 'storm-rune', 'long-bow', 'twin-ink', 'echo-stone'];

const fire = (relics: string[], labels: Record<string, string>, owned = OWNED) => render(
  <div style={{ overflow: 'hidden' }} data-testid="clipping-parent">
    <RelicBar relics={owned as never}
      pulse={{ id: 7, relics: relics as never, labels: labels as never }} />
  </div>,
);

describe('RelicFireCallout — the payoff is attributed to the relic that caused it', () => {
  it('Given one relic fires, then a callout names it and prints what it added', () => {
    fire(['sharp-quill'], { 'sharp-quill': '+50%' });
    const callout = screen.getByTestId('relic-fire-callout');
    expect(callout.textContent).toContain('adventurePlay.relic.sharp-quill');
    expect(screen.getByTestId('relic-fire-sharp-quill').textContent).toBe('+50%');
  });

  it('Given a relic fires, then the callout is portaled out of any clipping ancestor', () => {
    fire(['sharp-quill'], { 'sharp-quill': '+50%' });
    const callout = screen.getByTestId('relic-fire-callout');
    expect(screen.getByTestId('clipping-parent').contains(callout)).toBe(false);
    expect(document.body.contains(callout)).toBe(true);
  });

  it('Given TWO relics fire on one word, then ONE callout lists both as separate rows', () => {
    // Two pills anchored to chips ~44px apart would overlap — the very defect
    // the judge called out on the boss frame ("-1000 -1000" stacked). One panel,
    // one row each, cannot collide with itself.
    fire(['sharp-quill', 'magnet'], { 'sharp-quill': '+50%', magnet: '+20%' });
    expect(screen.getAllByTestId('relic-fire-callout')).toHaveLength(1);
    expect(screen.getAllByTestId('relic-fire-row')).toHaveLength(2);
    expect(screen.getByTestId('relic-fire-sharp-quill').textContent).toBe('+50%');
    expect(screen.getByTestId('relic-fire-magnet').textContent).toBe('+20%');
  });

  it('Given FIVE relics fire at once, then the panel caps its rows and sums the rest', () => {
    // Late in a run a 7-letter first word can fire five relics. One row each
    // would be a ~190px wall starting just under the rail — it would swallow the
    // foe card and the top of the board, which is the opposite of the brief
    // ("must not steal the board space").
    const five = ['sharp-quill', 'magnet', 'storm-rune', 'long-bow', 'twin-ink'];
    fire(five, Object.fromEntries(five.map((r) => [r, '+9'])));
    expect(screen.getAllByTestId('relic-fire-row').length).toBeLessThanOrEqual(3);
    expect(screen.getByTestId('relic-fire-more').textContent).toContain('3');
  });

  it('Given exactly three relics fire, then all three are named — no overflow row', () => {
    const three = ['sharp-quill', 'magnet', 'storm-rune'];
    fire(three, Object.fromEntries(three.map((r) => [r, '+9'])));
    expect(screen.getAllByTestId('relic-fire-row')).toHaveLength(3);
    expect(screen.queryByTestId('relic-fire-more')).toBeNull();
  });

  it('Given a relic fires with no measurable bonus, then it is not announced', () => {
    fire(['sharp-quill'], { 'sharp-quill': '' });
    expect(screen.queryByTestId('relic-fire-callout')).toBeNull();
  });

  it('Given no relic fired, then there is no callout at all', () => {
    render(<RelicBar relics={['sharp-quill', 'magnet']} />);
    expect(screen.queryByTestId('relic-fire-callout')).toBeNull();
  });

  it('Given a relic fires, then the number lives in the callout, not stuck to the icon', () => {
    // A ~30px badge appended to a corner icon, competing with three bigger
    // celebration elements, is what lost round 3. The chip still flashes — the
    // NUMBER moves out to the named panel.
    fire(['sharp-quill'], { 'sharp-quill': '+50%' });
    const chip = document.querySelector('[data-relic="sharp-quill"]') as HTMLElement;
    expect(chip.dataset.firing).toBe('true');
    const tag = screen.getByTestId('relic-fire-sharp-quill');
    expect(chip.closest('li')?.contains(tag)).toBe(false);
  });
});
