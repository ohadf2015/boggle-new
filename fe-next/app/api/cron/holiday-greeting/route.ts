import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin, generateUnsubscribeToken } from '@/lib/email';
import { loadCampaignRecipients, ensureUnsubscribeToken } from '@/lib/campaignRecipients';
import { planHolidayGreeting, sendHolidayGreetingToRecipient } from '@/lib/holidayGreetingEmail';
import { activeCampaigns, isDueNow } from '@/lib/holidayGreetingSchedule';
import { writeHeartbeat } from '@/lib/education/lifecycleLedger';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

export const maxDuration = 120;

const JOB = 'holiday-greeting';
const LEDGER = 'holiday_greeting_sent';
const BATCH_LIMIT = 200;
const SEND_BUDGET_MS = 90_000;

interface CampaignSummary {
  audience: number;
  due: number;
  sent: number;
  failed: number;
  alreadySent: number;
  deferred: number;
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const now = new Date();
  const campaigns = activeCampaigns(now);
  if (process.env.HOLIDAY_EMAIL_ENABLED !== 'true') {
    for (const campaign of campaigns) {
      const message = `holiday-greeting: campaign ${campaign.id} is live but HOLIDAY_EMAIL_ENABLED is not 'true'`;
      logger.error(`[Holiday Greeting] ${message}`);
      captureApiError(new Error(message), '/api/cron/holiday-greeting', { method: 'POST', statusCode: 200 });
    }
    return NextResponse.json({ success: true, skipped: 'disabled' });
  }
  if (campaigns.length === 0) {
    return NextResponse.json({ success: true, skipped: 'no-campaign' });
  }

  try {
    const locked = await withCronLock(JOB, 120_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('no service-role client');
      const audience = await loadCampaignRecipients(supabase);
      if (!audience.ok) throw new Error(audience.error);

      const started = Date.now();
      let budget = BATCH_LIMIT;
      const summaries: Record<string, CampaignSummary> = {};

      for (const campaign of campaigns) {
        const { plan } = planHolidayGreeting(audience.recipients, campaign.holiday);
        const summary: CampaignSummary = { audience: plan.length, due: 0, sent: 0, failed: 0, alreadySent: 0, deferred: 0 };
        summaries[campaign.id] = summary;

        if (plan.length === 0) {
          const message = `holiday-greeting: campaign ${campaign.id} is live but has 0 eligible recipients`;
          logger.error(`[Holiday Greeting] ${message}`);
          captureApiError(new Error(message), '/api/cron/holiday-greeting', { method: 'POST', statusCode: 200 });
          continue;
        }

        const { data: sentRows, error: ledgerError } = await supabase
          .from(LEDGER)
          .select('user_id')
          .eq('campaign', campaign.id);
        if (ledgerError) throw new Error(`${LEDGER} select failed: ${ledgerError.message}`);
        const alreadySent = new Set((sentRows ?? []).map((r: { user_id: string }) => r.user_id));

        const due = plan.filter(({ recipient }) => !alreadySent.has(recipient.id) && isDueNow(campaign, recipient, now));
        summary.due = due.length;

        for (const { recipient, holiday, language } of due) {
          if (budget <= 0 || Date.now() - started > SEND_BUDGET_MS) {
            summary.deferred++;
            continue;
          }
          const { data: claimed, error: claimError } = await supabase
            .from(LEDGER)
            .upsert({ user_id: recipient.id, campaign: campaign.id }, { onConflict: 'user_id,campaign', ignoreDuplicates: true })
            .select('user_id');
          if (claimError) throw new Error(`${LEDGER} claim failed: ${claimError.message}`);
          if (!claimed?.length) {
            summary.alreadySent++;
            continue;
          }
          budget--;

          let outcome: { success: boolean; error?: string };
          try {
            const token = await ensureUnsubscribeToken(supabase, recipient, generateUnsubscribeToken);
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lexiclash.live';
            outcome = await sendHolidayGreetingToRecipient({
              email: recipient.email,
              recipientName: recipient.display_name || recipient.username || 'Word Hunter',
              language,
              holiday,
              unsubscribeUrl: `${baseUrl}/api/email/unsubscribe?token=${token}`,
            });
          } catch (err) {
            outcome = { success: false, error: err instanceof Error ? err.message : String(err) };
          }

          if (outcome.success) {
            summary.sent++;
            continue;
          }
          summary.failed++;
          logger.error(`[Holiday Greeting] send failed for ${recipient.id} (${campaign.id}): ${outcome.error}`);
          const { error: releaseError } = await supabase
            .from(LEDGER)
            .delete()
            .eq('user_id', recipient.id)
            .eq('campaign', campaign.id);
          if (releaseError) logger.error(`[Holiday Greeting] could not release ${recipient.id}: ${releaseError.message}`);
        }
      }

      const result = { campaigns: summaries };
      await writeHeartbeat(supabase, JOB, result, now);
      logger.log(`[Holiday Greeting] ${JSON.stringify(result)}`);
      return result;
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[Holiday Greeting] Error:', message);
    captureApiError(error instanceof Error ? error : new Error(message), '/api/cron/holiday-greeting', {
      method: 'POST',
      statusCode: 500,
    });
    return NextResponse.json({ error: 'Failed to send holiday greetings' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
