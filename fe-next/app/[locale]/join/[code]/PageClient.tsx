/**
 * `/[locale]/join/[code]` — where the projector's QR code lands.
 *
 * The whole point of this URL is that the student already has the code, so it
 * hands `JoinFlow` a pre-filled code and the flow opens straight on the
 * nickname step. It deliberately does NOT wait for auth before rendering:
 * gating on `loading` puts a full-screen spinner between a phone camera and a
 * nickname field, which is exactly the delay this redesign exists to delete.
 * `JoinFlow` handles an unresolved session itself — a tap that lands early is
 * held and replayed, never dropped.
 *
 * Anyone can use it, signed in or not: a logged-out student joins as a guest
 * by typing a name. Requiring an account first (what this page used to do) put
 * a signup wall in front of the one action the link exists for.
 */

'use client';

import { useParams } from 'next/navigation';
import JoinFlow from '@/components/education/join/JoinFlow';

export default function JoinWithCodePageClient() {
  const params = useParams();
  const rawCode = (params?.code as string) ?? '';
  // `JoinFlow` sanitizes and decides for itself whether six valid characters
  // arrived; a junk code lands on the code step rather than dead-ending.
  return <JoinFlow initialCode={rawCode} />;
}
