import { NextRequest, NextResponse } from 'next/server';
import { isSameOrigin } from '@/lib/auth/sameOrigin';
import { verifyCuratorAuth } from '@/lib/auth/curatorAuth';
import { validateProposalInput, buildProposalRow, type ProposalInput } from '@/lib/curator/curatorProposal';
import { canProposeKind } from '@/lib/curator/curatorScope';
import { createClient } from '@/utils/supabase/server';
import { captureApiError } from '@/utils/sentry';

/**
 * POST /api/curator/propose  { kind, language, targetRef, payload? }
 *
 * A Language Curator opens a content-quality proposal (approve/reject/flag a
 * word, or a puzzle verdict). The row lands in curator_proposals with
 * status='proposed' — never a direct write to master content. An admin (later:
 * curator quorum/heuristic) ratifies it, which applies the effect and awards
 * the curator's prestige points + any coin milestone.
 *
 * The insert uses the user's own session client, so the RLS INSERT policy
 * (curator_id = auth.uid() AND is_language_curator(language) AND
 * status='proposed') re-checks the write — verifyCuratorAuth is defence in depth.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // CSRF: state-changing POST that can authenticate via an ambient cookie.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'cross-origin request rejected' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Partial<ProposalInput> | null;
  const input: ProposalInput = {
    kind: body?.kind as ProposalInput['kind'],
    language: String(body?.language ?? ''),
    targetRef: String(body?.targetRef ?? ''),
    payload: (body?.payload as Record<string, unknown>) ?? {},
  };

  const valid = validateProposalInput(input);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  // Must be an active curator for THIS proposal's language (admins bypass).
  const auth = await verifyCuratorAuth(request, { language: input.language });
  if (!auth.success || !auth.user) {
    return auth.response ?? NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Capability gate: trust_tier decides WHICH proposal kinds a curator may open.
  // tier 1 = flag/reject, tier 2 = +approve, tier 3 = +puzzle verdicts. Admins
  // resolve to MAX_CURATOR_TIER so they pass. The RLS INSERT policy re-checks
  // curator-ship but NOT tier, so this is the only place tier is enforced.
  if (!canProposeKind(auth.tier ?? 0, input.kind)) {
    return NextResponse.json({ error: 'insufficient_tier' }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const row = buildProposalRow(input, auth.user.id);
    const { data, error } = await supabase
      .from('curator_proposals')
      .insert(row)
      .select('id')
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/curator/propose',
      { method: 'POST' }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
