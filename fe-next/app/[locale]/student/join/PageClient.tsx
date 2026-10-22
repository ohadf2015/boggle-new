/**
 * `/[locale]/student/join` — the in-app "join a class" entry.
 *
 * Same surface as `/join` and `/join/[code]`: one `JoinFlow`, so a student
 * cannot meet two different join screens depending on which door they came
 * through (recurring pitfall class 3). No account required — a logged-out
 * student joins as a guest by typing a name.
 *
 * No auth gate here on purpose. `JoinFlow` renders immediately and holds a tap
 * that lands before the session resolves.
 */

'use client';

import JoinFlow from '@/components/education/join/JoinFlow';
import { StudentJoinBackdrop } from '@/components/student/academy/StudentJoinBackdrop';

export default function StudentJoinPageClient() {
  // The backdrop comes FIRST with no z-index, so the flow (later, positioned)
  // and the success confetti paint above it.
  return (
    <div>
      <StudentJoinBackdrop />
      <JoinFlow variant="academy" />
    </div>
  );
}
