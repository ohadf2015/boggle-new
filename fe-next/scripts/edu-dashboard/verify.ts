/**
 * Cross-checks the education dashboard against independent SQL. Runs the route's own
 * fetch (fetchEduRawRows) and the same prepare/build code, then compares each 30-day
 * KPI and funnel step with the numbers from expected.sql.
 *
 * Usage (service-role env exported in the shell, never committed):
 *   npx tsx scripts/edu-dashboard/verify.ts scripts/edu-dashboard/expected-30d.json
 * Exit 0 = every number matches. Exit 1 = mismatch, printed per field.
 */
import { readFileSync } from 'node:fs';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { fetchEduRawRows } from '@/lib/admin/eduDashboardRows';
import { prepareEduDashboardInput } from '@/lib/admin/eduDashboardInput';
import { buildEduDashboard } from '@/lib/admin/eduDashboard';

async function main() {
  const expectedPath = process.argv[2];
  if (!expectedPath) throw new Error('usage: verify.ts <expected.json>');
  const expected = JSON.parse(readFileSync(expectedPath, 'utf8')) as Record<string, number>;

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase service env not set');

  const nowMs = Date.now();
  const sinceIso = new Date(nowMs - 2 * 30 * 86_400_000).toISOString();
  const fetched = await fetchEduRawRows(supabase, sinceIso);
  if (!fetched.ok) throw new Error(`fetch failed: ${fetched.error}`);

  const input = prepareEduDashboardInput(fetched.raw, nowMs, 30);
  const dash = buildEduDashboard(input);
  const studentIds = new Set(input.memberships.map((m) => m.student_id));
  const funnel = Object.fromEntries(dash.funnel.map((s) => [s.key, s.count]));

  const actual: Record<string, number> = {
    active_teachers_cur: dash.kpis.activeTeachers.current,
    active_teachers_prior: dash.kpis.activeTeachers.prior,
    new_teachers_cur: dash.kpis.newTeachers.current,
    new_teachers_prior: dash.kpis.newTeachers.prior,
    trials_started_cur: dash.kpis.trialsStarted.current,
    trials_started_prior: dash.kpis.trialsStarted.prior,
    trials_paid_cur: dash.kpis.trialsPaid.current,
    trials_paid_prior: dash.kpis.trialsPaid.prior,
    funnel_requested: funnel.requested,
    funnel_approved: funnel.approved,
    funnel_classroom: funnel.classroom,
    funnel_student: funnel.student,
    classes_total: dash.classes.length,
    students_distinct: studentIds.size,
  };

  let mismatches = 0;
  for (const key of Object.keys(expected)) {
    const ok = actual[key] === expected[key];
    if (!ok) mismatches += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${key}: sql=${expected[key]} api=${actual[key]}`);
  }
  console.log(`roundsAvailable=${dash.roundsAvailable} (liveRounds=${dash.kpis.liveRounds === null ? 'null' : 'set'})`);
  process.exit(mismatches === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
