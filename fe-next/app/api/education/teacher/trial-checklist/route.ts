/**
 * GET/PATCH /api/education/teacher/trial-checklist
 *
 * Persists Teacher Pro Day-0 trial activation checklist dismiss and
 * completion timestamps on public.profiles. Flags only turn on.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  applyTrialChecklistPatch,
  profileUpdateFromPatch,
  progressFromProfileRow,
  TRIAL_CHECKLIST_PROFILE_COLUMNS,
  type TrialChecklistPatch,
  type TrialChecklistProfileRow,
} from '@/lib/education/trialChecklistProgress';

const SELECT = TRIAL_CHECKLIST_PROFILE_COLUMNS.join(', ');

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function parsePatch(body: unknown): TrialChecklistPatch | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;
  if (
    raw.dismissed === false ||
    raw.completed === false ||
    raw.allStepsDone === false
  ) {
    return null;
  }
  const patch: TrialChecklistPatch = {};
  if (raw.dismissed === true) patch.dismissed = true;
  if (raw.completed === true || raw.allStepsDone === true) {
    patch.completed = true;
  }
  if (
    (raw.dismissed !== undefined && raw.dismissed !== true) ||
    (raw.completed !== undefined && raw.completed !== true) ||
    (raw.allStepsDone !== undefined && raw.allStepsDone !== true)
  ) {
    return null;
  }
  if (Object.keys(patch).length === 0) return null;
  return patch;
}

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return bad('Unauthorized', 401);

  const { data, error } = await supabase
    .from('profiles')
    .select(SELECT)
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: true, ...progressFromProfileRow(null), unavailable: true },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    ...progressFromProfileRow(data as TrialChecklistProfileRow | null),
  });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await authed();
  if (!user) return bad('Unauthorized', 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad('invalid json');
  }
  const patch = parsePatch(body);
  if (!patch) return bad('empty or invalid patch');

  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select(SELECT)
    .eq('id', user.id)
    .maybeSingle();

  const current = progressFromProfileRow(
    readError ? null : (existing as TrialChecklistProfileRow | null),
  );
  const next = applyTrialChecklistPatch(current, patch);
  const unset: TrialChecklistPatch = {
    dismissed: patch.dismissed && !current.dismissed,
    completed: patch.completed && !current.completed,
  };
  const nowIso = new Date().toISOString();
  const update = profileUpdateFromPatch(unset, nowIso);
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, ...next });
  }

  const { error: writeError } = await supabase
    .from('profiles')
    .update({ ...update, updated_at: nowIso })
    .eq('id', user.id);

  if (writeError) {
    return NextResponse.json({ ok: true, ...next, unavailable: true }, { status: 200 });
  }

  return NextResponse.json({ ok: true, ...next });
}
