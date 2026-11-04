import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { captureApiError } from '@/utils/sentry';
import { captureEduServerEvents, type EduServerEvent } from '@/backend/utils/educationTelemetry';
import {
  deleteUserWithRetry,
  loadDeleteImpact,
  normalizeDeleteReason,
  type DeleteImpactSummary,
} from '@/lib/account/deleteAccountImpact';
import {
  buildAccountDeletedEvent,
  loadAccountDeletedFacts,
} from '@/lib/account/accountDeletedEvent';

/**
 * DELETE /api/account/delete
 * Permanently deletes the authenticated user's account and all associated data.
 * Uses admin client to delete from auth.users — cascades to profiles and all FK'd tables.
 *
 * "All FK'd tables" is the catch: teacher access rows are keyed by the email
 * STRING, not by a user id, so no cascade reaches them. A teacher who deleted
 * her account on 2026-09-20 still had her address sitting in
 * `teacher_access_requests` afterwards. Anything holding the address as text
 * has to be cleared explicitly, here, before the auth row (and with it the
 * only copy of the email) goes away.
 *
 * Teacher retention (t_b5825a0a): the only activated classroom teacher deleted
 * her account 6 minutes after the day-2 value email with no class-impact
 * warning, no lighter alternative, and a deleteUser that timed out (504)
 * without retry. Now: GET reports classroom impact for the interstitial, the
 * delete carries an optional { reason, surface } body onto teacher_delete_*
 * telemetry, growth:account_deleted is captured once before deleteUser (so a
 * failed delete is still visible to Growth Radar, with no email or name), and
 * deleteUser retries a timeout/5xx once — treating
 * user-not-found as the success a completed-then-retried delete returns.
 */

function impactEventProps(impact: DeleteImpactSummary): Record<string, unknown> {
  return {
    classroom_count: impact.classrooms.length,
    student_count: impact.totalStudents,
    rounds_played: impact.roundsPlayed,
    email_subscribed: impact.emailSubscribed,
  };
}

/**
 * GET /api/account/delete
 * Impact summary for the signed-in user — drives the teacher-aware confirm
 * step (roster warning, alternatives). Non-teachers get isTeacher: false.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const impact = await loadDeleteImpact(admin, user.id);
    return NextResponse.json(impact);
  } catch (err) {
    captureApiError(
      err instanceof Error ? err : new Error('Delete impact lookup error'),
      '/api/account/delete',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 1. Verify the user is authenticated via session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional body: { reason, surface } from the teacher interstitial. A bare
    // DELETE with no body (older clients, scripts) is still fully valid.
    let reason: string | null = null;
    let surface: string | null = null;
    try {
      const body = await request.json();
      reason = normalizeDeleteReason(body?.reason);
      surface = typeof body?.surface === 'string' ? body.surface.slice(0, 40) : null;
    } catch {
      // No/invalid JSON body — proceed without it.
    }

    // 2. Get admin client (service role — bypasses RLS)
    const admin = createAdminClient();
    if (!admin) {
      captureApiError(
        new Error('Admin client unavailable for account deletion'),
        '/api/account/delete',
        { method: 'DELETE', userId: user.id, statusCode: 500 }
      );
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 3. Impact snapshot BEFORE anything is deleted — the telemetry below is
    //    the only record of what this account's classrooms looked like.
    const impact = await loadDeleteImpact(admin, user.id);

    // 4. Clean up push tokens explicitly (may not have CASCADE FK)
    await admin
      .from('user_push_tokens')
      .delete()
      .eq('user_id', user.id)
      .then(() => {});

    // 5. Clear rows keyed by the email STRING — no FK, so no cascade. Must run
    //    BEFORE deleteUser, which is what destroys our copy of the address.
    //    Signup lowercases the address while the request row keeps whatever the
    //    teacher typed, so match lowercased on both sides.
    const email = user.email?.toLowerCase();
    if (email) {
      for (const table of ['teacher_access_requests', 'teacher_access_allowlist'] as const) {
        const { error: emailRowError } = await admin.from(table).delete().eq('email', email);
        // Non-fatal: the account must still go. But it must not vanish
        // silently — an un-erased address is the whole point of the request.
        if (emailRowError) {
          captureApiError(
            new Error(`Failed to clear ${table} for deleted account: ${emailRowError.message}`),
            '/api/account/delete',
            { method: 'DELETE', userId: user.id, statusCode: 500 }
          );
        }
      }
    }

    // 6. Snapshot + growth event BEFORE deleteUser. A 504/5xx used to erase
    //    the only record that a teacher left — teacher_delete_failed only
    //    fires for classroom owners, and the old growth:account_deleted ran
    //    after a successful delete. Capture once, here, so it is recorded
    //    even when deleteUser errors. captureEduServerEvents stamps $host.
    let deletedFacts = {
      role: null as string | null,
      signupSurface: null as string | null,
      utmCampaign: null as string | null,
      rounds: 0,
      lastRoundAt: null as string | null,
    };
    try {
      deletedFacts = await loadAccountDeletedFacts(
        admin,
        user.id,
        impact.classrooms.map((c) => c.id),
      );
    } catch {
      // Failed snapshot still emits the event (nulls), and never blocks deletion.
    }
    const metaSurface = typeof user.user_metadata?.signup_surface === 'string'
      ? user.user_metadata.signup_surface
      : null;
    try {
      captureEduServerEvents([
        buildAccountDeletedEvent({
          userId: user.id,
          createdAt: user.created_at,
          reason,
          impact,
          facts: {
            ...deletedFacts,
            signupSurface: deletedFacts.signupSurface ?? metaSurface,
          },
        }),
      ]);
    } catch {
      // Fire-and-forget — telemetry failure must never block or fail the deletion.
    }

    // 7. Delete the auth user — cascades to profiles and all FK'd tables.
    //    Retried once on timeout/5xx; user-not-found or confirmed gone means
    //    a previous attempt already completed and is treated as success.
    const outcome = await deleteUserWithRetry(admin, user.id);

    if (!outcome.ok) {
      if (impact.isTeacher) {
        try {
          captureEduServerEvents([
            {
              distinctId: user.id,
              event: 'teacher_delete_failed',
              properties: {
                teacher_id: user.id,
                ...impactEventProps(impact),
                ...(reason ? { reason } : {}),
                ...(surface ? { surface } : {}),
                attempts: outcome.attempts,
                error: outcome.error?.message ?? 'unknown',
              },
            },
          ]);
        } catch {
          // Fire-and-forget — telemetry failure must never block or fail response
        }
      }
      captureApiError(
        new Error(outcome.error?.message ?? 'deleteUser failed'),
        '/api/account/delete',
        { method: 'DELETE', userId: user.id, statusCode: 500 }
      );
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    // A timeout or user-not-found can mean GoTrue already committed the delete.
    // alreadyDeleted is that case — same success body shape as a clean delete.
    if (outcome.alreadyDeleted) {
      console.warn(
        '[account/delete] deleteUser timed out or errored but the user is gone; treating as success',
        { userId: user.id, attempts: outcome.attempts },
      );
    }

    // Teacher-only completion telemetry. growth:account_deleted already fired
    // once, before deleteUser, including when this outcome is a retry success.
    const telemetry: EduServerEvent[] = [];

    if (impact.isTeacher) {
      telemetry.push({
        distinctId: user.id,
        event: 'teacher_delete_completed',
        properties: {
          teacher_id: user.id,
          ...impactEventProps(impact),
          ...(reason ? { reason } : {}),
          ...(surface ? { surface } : {}),
          attempts: outcome.attempts,
          ...(outcome.alreadyDeleted ? { already_deleted: true } : {}),
        },
      });
    }

    try {
      captureEduServerEvents(telemetry);
    } catch {
      // Fire-and-forget — telemetry failure must never block or fail the deletion.
    }

    return NextResponse.json({ success: true, alreadyDeleted: outcome.alreadyDeleted });
  } catch (err) {
    captureApiError(
      err instanceof Error ? err : new Error('Account deletion error'),
      '/api/account/delete',
      { method: 'DELETE', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
