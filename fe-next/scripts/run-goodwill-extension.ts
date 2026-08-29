/**
 * One-shot operator script for the goodwill trial extension.
 *
 * Same logic as `POST /api/cron/teacher-goodwill-extension` — it imports the
 * same planner and the same template — but runs from the repo so the send can
 * be driven and watched line by line instead of through an HTTP endpoint whose
 * secret would have to be handled. `loadEnvConfig` reads .env.local the way
 * Next does; the credentials never leave the process.
 *
 *   npx tsx scripts/run-goodwill-extension.ts          # dry run, writes nothing
 *   npx tsx scripts/run-goodwill-extension.ts --send   # extends + emails
 */
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createClient } from '@supabase/supabase-js';
import {
  planTrialExtension,
  type ExtendableRow,
} from '../lib/education/trialExtension';
import { teacherGoodwillExtension } from '../lib/email/templates/teacherGoodwillExtension';

const SEND = process.argv.includes('--send');

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('missing Supabase service-role credentials');
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('teacher_access_requests')
    .select('id, email, user_id, full_name, locale, created_at, trial_expires_at, trial_reminders_sent')
    .eq('status', 'approved');
  if (error) throw new Error(`select failed: ${error.message}`);

  const plans = planTrialExtension((data ?? []) as ExtendableRow[], Date.now());
  console.log(`approved rows: ${data?.length ?? 0}`);
  console.log(`teachers due an extension: ${plans.length}`);
  for (const { row, newExpiresAt } of plans) {
    console.log(`  ${row.email.padEnd(38)} ${row.locale}  ${String(row.trial_expires_at ?? 'none').slice(0, 10)} -> ${newExpiresAt.slice(0, 10)}`);
  }
  if (!SEND) {
    console.log('\nDRY RUN — nothing written, nothing sent. Re-run with --send.');
    return;
  }

  // Resend is imported lazily so a dry run needs no mail credentials at all.
  const { sendEmail } = await import('../lib/email/send');

  let sent = 0;
  let failed = 0;
  for (const { row, newExpiresAt, newRemindersSent } of plans) {
    // Extend first: the email names the new deadline, so a send in front of a
    // failed write would promise days the teacher does not have.
    const { error: extendError } = await supabase
      .from('teacher_access_requests')
      .update({ trial_expires_at: newExpiresAt, trial_reminders_sent: newRemindersSent })
      .eq('id', row.id);
    if (extendError) {
      failed++;
      console.error(`  EXTEND FAILED ${row.email}: ${extendError.message}`);
      continue;
    }

    const tpl = teacherGoodwillExtension({
      full_name: row.full_name,
      locale: row.locale,
      newExpiresAt,
    });
    const result = await sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });
    if (!result.ok) {
      failed++;
      console.error(`  EMAIL FAILED ${row.email}: ${result.error} (extension stands)`);
      continue;
    }
    sent++;
    console.log(`  sent -> ${row.email}`);
  }
  console.log(`\ndone: ${sent} sent, ${failed} failed, of ${plans.length} due`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
