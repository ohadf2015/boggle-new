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

export default function StudentJoinPageClient() {
  return <JoinFlow />;
}
