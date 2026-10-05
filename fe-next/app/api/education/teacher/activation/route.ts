/**
 * GET/PATCH /api/education/teacher/activation
 *
 * Persists first-run Teacher Activation Checklist completions on the
 * teacher profile (copy invite, start live, dismiss). Flags only turn on.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  applyActivationPatch,
  progressFromProfileRow,
  profileUpdateFromPatch,
  TEACHER_ACTIVATION_PROFILE_COLUMNS,
  type TeacherActivationPatch,
  type TeacherActivationProfileRow,
} from '@/lib/education/teacherActivationProgress';

const SELECT = TEACHER_ACTIVATION_PROFILE_COLUMNS.join(', ');

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function parsePatch(body: unknown): TeacherActivationPatch | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;
  const patch: TeacherActivationPatch = {};
  if (raw.inviteCopied === true) patch.inviteCopied = true;
  if (raw.liveStarted === true) patch.liveStarted = true;
  if (raw.dismissed === true) patch.dismissed = true;
  if (raw.inviteCopied === false || raw.liveStarted === false || raw.dismissed === false) {
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
    ...progressFromProfileRow(data as TeacherActivationProfileRow | null),
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
    readError ? null : (existing as TeacherActivationProfileRow | null),
  );
  const next = applyActivationPatch(current, patch);
  const update = profileUpdateFromPatch(patch, new Date().toISOString());
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, ...next });
  }

  const { error: writeError } = await supabase
    .from('profiles')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (writeError) {
    return NextResponse.json({ ok: true, ...next, unavailable: true }, { status: 200 });
  }

  return NextResponse.json({ ok: true, ...next });
}
