/**
 * `/[locale]/student/join` — the in-app "join a class" entry.
 *
 * Same surface as `/join` and `/join/[code]`: one `JoinFlow`, so a student
 * cannot meet two different join screens depending on which door they came
 * through (recurring pitfall class 3). No account required — a logged-out
 * student joins as a guest by typing a name.
 *
 * No auth gate here on purpose. `JoinFlow` renders immediately and holds a tap
 * that lands before the session resolves; a full-page loader in front of the
 * code field is the wait this redesign exists to remove.
 */

'use client';

import JoinFlow from '@/components/education/join/JoinFlow';
import { StudentJoinBackdrop } from '@/components/student/academy/StudentJoinBackdrop';

// Literal class strings on purpose: Tailwind only generates arbitrary
// variants it can read verbatim in source.
const FLOW_SKIN = [
  '[&>[data-testid=bounded-confetti-anchor]]:!w-full',
  '[&>[data-testid=bounded-confetti-anchor]]:!h-auto',
  '[&>[data-testid=bounded-confetti-anchor]>div]:!bg-transparent',
  '[&>[data-testid=bounded-confetti-anchor]>div>div[aria-hidden=true]]:hidden',
].join(' ');

export default function StudentJoinPageClient() {
  // Same flow as `/join`; the Academy arena is painted behind it. The wrapper
  // (plain div — no stacking context) reaches into JoinFlow's markup with
  // important utilities, without editing the shared component:
  //  - its confetti anchor is pinned inline to 390x844, which squeezed the
  //    flow into the top-left corner of a desktop — stretch it to full width;
  //  - its root paints solid navy and three decorative slabs — make the root
  //    transparent and drop the slabs so the arena shows through.
  // `fit`: the flow owns the viewport and sizes itself to it (no page scroll
  // from a 360px phone on its side to a 1440p TV). It replaces a fixed
  // `lg:scale-[1.3]` that pushed 1280x720 past the fold and left TVs tiny.
  // The backdrop comes FIRST with no z-index, so the flow (later, positioned)
  // and the success confetti (portaled to <body>) both paint above it.
  return (
    <div className={FLOW_SKIN}>
      <StudentJoinBackdrop />
      <JoinFlow fit />
    </div>
  );
}
