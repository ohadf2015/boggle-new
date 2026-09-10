'use client';

import { useSearchParams } from 'next/navigation';
import JoinFlow from '@/components/education/join/JoinFlow';

/**
 * `/[locale]/join` — the address a teacher says out loud.
 *
 * This route used to 404, then became a second, smaller code form whose only
 * job was to validate and forward to `/join/[code]`. That forward is a page
 * navigation the student pays for in the middle of the ten seconds we are
 * trying to win, and it made two code fields with two behaviours out of one
 * job (recurring pitfall class 3). It is now the same `JoinFlow` as every
 * other entry point.
 *
 * `?code=` is read here because the projector's share sheet and several
 * outbound links carry it, and it was silently ignored for months — a student
 * arriving with the code already in the URL was still asked to type it.
 */
export function JoinCodePageClient() {
  const searchParams = useSearchParams();
  const initialCode = searchParams?.get('code') ?? searchParams?.get('pin') ?? '';
  return <JoinFlow initialCode={initialCode} />;
}

export default JoinCodePageClient;
