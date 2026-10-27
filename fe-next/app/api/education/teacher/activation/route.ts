/**
 * GET/PATCH /api/education/teacher/activation
 *
 * Persists first-run Teacher Activation Checklist completions on the
 * teacher profile (copy invite, start live, dismiss). Flags only turn on.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureEduServerEvents } from '@/backend/utils/educationTelemetry';
import { buildJoinCodeCopyRecordedEvent } from '@/backend/utils/educationRoundTelemetry';
import { isAnyTestAccount } from '@/lib/education/eduTestAccount';
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
  if (raw.roomOpened === true) patch.roomOpened = true;
  if (raw.dismissed === true) patch.dismissed = true;
  // liveStarted is deliberately NOT settable from the client: it means "a real
  // 2+ player round completed" and only the backend (recordClassroomRound) may
  // stamp it. A client that still sends it gets 400, which its fetch swallows.
  if (
    raw.inviteCopied === false ||
    raw.roomOpened === false ||
    raw.dismissed === false ||
    raw.liveStarted !== undefined
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
  const unset: TeacherActivationPatch = {
    inviteCopied: patch.inviteCopied && !current.inviteCopied,
    liveStarted: patch.liveStarted && !current.liveStarted,
    roomOpened: patch.roomOpened && !current.roomOpened,
    dismissed: patch.dismissed && !current.dismissed,
  };
  const update = profileUpdateFromPatch(unset, new Date().toISOString());
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

  if (unset.inviteCopied) {
    const isTestAccount = await isAnyTestAccount(createAdminClient(), [user.id]);
    captureEduServerEvents([buildJoinCodeCopyRecordedEvent({ teacherId: user.id, isTestAccount })]);
  }
  return NextResponse.json({ ok: true, ...next });
}
