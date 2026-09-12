/**
 * @vitest-environment jsdom
 *
 * RED first — ONE dominant action on the finish screen.
 *
 * Measured live at 390x844 (2026-09-12, screenshot
 * `/tmp/hw-r6/flow-04-completion-390.png`): the turn-in block stacked two
 * full-width saturated-green buttons — the lime "Open Google Classroom grade
 * receipt" and, immediately under it, the WhatsApp-green "Share practice card
 * on WhatsApp". Both read as the primary thing to do next, which is exactly the
 * decision-fatigue rule's failure case (one primary CTA per screen, everything
 * else secondary) and also puts two accent fills on one surface.
 *
 * Turning in the work is the action; telling a parent about it is an extra. So
 * the grade receipt keeps the lime fill and the share drops to the documented
 * secondary treatment — cream text and a 2px cream border on the navy surface,
 * which still clears the 3:1 edge rule without competing for the eye. The
 * WhatsApp glyph keeps the brand colour so the control is still recognisable.
 *
 * Both links must keep working — that is the point of the surface — so this
 * also pins the hrefs, not only the paint.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MissGapTurnInActions } from '../MissGapTurnInActions';
import { toMissGapAssignmentPayload } from '@/lib/education/missGapAsyncAssignment';

const payload = toMissGapAssignmentPayload({
  locale: 'en',
  lesson: 'Week 3 Vocabulary',
  teacher: 'Ms G',
  found: 12,
  total: 20,
  missedWords: ['brave', 'gleam', 'harvest'],
  dueDate: '2099-01-01',
});

const score = { pointsEarned: 80, maxPoints: 100, accuracy: 80, onTime: true } as never;

function renderActions() {
  return render(
    <MissGapTurnInActions
      completed
      payload={payload}
      lesson="Week 3 Vocabulary"
      gradeScore={score}
      gradePassbackHref="/en/education/miss-gap-grade-passback?x=1"
    />,
  );
}

describe('MissGapTurnInActions — one dominant action', () => {
  it('keeps the grade receipt as the only filled primary', () => {
    renderActions();
    const primary = screen.getByTestId('miss-gap-async-open-grade-passback');
    expect(primary.className).toContain('bg-neo-lime');
    expect(primary.getAttribute('href')).toContain('miss-gap-grade-passback');
  });

  it('demotes the parent share to a bordered secondary, not a second green slab', () => {
    renderActions();
    const share = screen.getByTestId('miss-gap-async-whatsapp-share');
    expect(share.className).not.toContain('bg-brand-whatsapp');
    // Secondary per the design addendum: cream text + a visible cream border on
    // the navy surface (written as `border-[2px]` so a cn() merge cannot drop
    // the width next to the colour class).
    expect(share.className).toContain('border-[2px]');
    expect(share.className).toContain('border-neo-cream');
    expect(share.className).toContain('text-neo-cream');
  });

  it('still opens WhatsApp with the practice card', () => {
    renderActions();
    const share = screen.getByTestId('miss-gap-async-whatsapp-share');
    const href = share.getAttribute('href') || '';
    expect(href).toContain('whatsapp');
    expect(decodeURIComponent(href)).toContain('miss-gap-whatsapp');
  });
});
