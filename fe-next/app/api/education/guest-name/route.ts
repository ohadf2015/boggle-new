import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { suggestAvailableGuestName } from '@/lib/education/guestNameCollision';
import logger from '@/utils/logger';

/**
 * POST /api/education/guest-name  { name, joinCode? }
 *   → 200 { available: true }  |  409 { code: 'NAME_TAKEN', suggestedName }
 *
 * Answers one question: is this display name already used by someone in THIS
 * classroom?
 *
 * It used to answer a different and much worse question — is this username
 * taken anywhere on the platform — because `profiles.username` is globally
 * unique and the guest slug was derived straight from the typed name. The first
 * Priya in a brand-new class was refused because another school had a Priya.
 * `deriveGuestUsername` now appends a random suffix, so usernames never collide
 * and the underlying Supabase 500 is gone at its source; this route no longer
 * has anything to say about usernames at all.
 *
 * Without a `joinCode` there is no classroom to scope to, so the answer is
 * "available". That is not a gap: with unique usernames there is nothing left
 * that can fail, and refusing a join because we could not identify the room
 * would be inventing a new dead end to prevent a cosmetic one.
 *
 * Service-role, because `classroom_memberships` and `profiles` are not readable
 * by an unauthenticated browser — own-row RLS returns zero rows with a null
 * error, which would call every name free. It returns a single suggestion and
 * nothing else: no roster, no count, no other student's name.
 *
 * FAILS OPEN throughout. A duplicate name is a cosmetic problem; a student who
 * cannot join because our lookup broke is a real one.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = body as { name?: unknown; joinCode?: unknown } | null;
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const joinCode =
    typeof payload?.joinCode === 'string' ? payload.joinCode.trim().toUpperCase() : '';
  // No room named → nothing local to compare against. See the note above: this
  // is a deliberate pass, not a missing check.
  if (!joinCode) {
    return NextResponse.json({ available: true, name });
  }

  const admin = createAdminClient();
  if (!admin) {
    logger.error('guest-name: no admin client; skipping duplicate-name check');
    return NextResponse.json({ available: true, name });
  }

  try {
    const { data: classroomRow, error: classroomError } = await admin
      .from('classrooms')
      .select('id')
      .eq('join_code', joinCode)
      .maybeSingle();

    // An unknown code is the join route's problem to report, not ours — and it
    // must not read as "that name is taken".
    if (classroomError || !classroomRow) {
      return NextResponse.json({ available: true, name });
    }

    const classroomId = (classroomRow as { id: string }).id;

    // TWO reads, not an embed. `classroom_memberships` has exactly two foreign
    // keys — `classroom_id` -> `public.classrooms` and `student_id` ->
    // **`auth.users`** — and none to `public.profiles`, so PostgREST cannot
    // resolve `profiles(...)` off this table. It answers PGRST200 ("could not
    // find a relationship"), which this route's fail-open path swallowed into
    // "available": the check was dormant and every name came back free.
    // Proven live: FirstTapAda was one of 7 members of UY6W8L and the route
    // still said available:true.
    const { data: memberRows, error: membershipError } = await admin
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId);

    if (membershipError) {
      logger.error('guest-name: membership lookup failed', membershipError);
      return NextResponse.json({ available: true, name });
    }

    const studentIds = ((memberRows ?? []) as Array<{ student_id?: unknown }>)
      .map((r) => r.student_id)
      .filter((id): id is string => typeof id === 'string' && id !== '');

    // An empty class has nothing to clash with, and `.in('id', [])` is a
    // round trip a joining student would wait on for no reason.
    if (studentIds.length === 0) {
      return NextResponse.json({ available: true, name });
    }

    const { data: profileRows, error: profilesError } = await admin
      .from('profiles')
      .select('display_name')
      .in('id', studentIds);

    if (profilesError) {
      logger.error('guest-name: profile lookup failed', profilesError);
      return NextResponse.json({ available: true, name });
    }

    // Compare against what students actually SEE. `username` is an opaque
    // internal handle now (it carries a random suffix), so it is not a name
    // anyone would recognise as a clash; `display_name` is what the roster and
    // the projected standings render.
    const takenNames = new Set(
      ((profileRows ?? []) as Array<{ display_name?: unknown }>)
        .map((r) => r.display_name)
        .filter((n): n is string => typeof n === 'string' && n.trim() !== '')
    );

    const suggestion = suggestAvailableGuestName(name, takenNames);
    if (suggestion.available) {
      return NextResponse.json({ available: true, name });
    }

    return NextResponse.json(
      { available: false, code: 'NAME_TAKEN', name, suggestedName: suggestion.name },
      { status: 409 }
    );
  } catch (err) {
    logger.error('guest-name: unexpected failure', err);
    return NextResponse.json({ available: true, name });
  }
}
