/**
 * Admin-only notifications: one row per interesting event, read by the admin bell and,
 * for `high` severity, pushed to Telegram. Fail-open by design: a missing table, a
 * database error or a Telegram outage must never break the request that raised the event.
 */

import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { escapeTelegramMarkdownV2, sendTelegramMessage } from '@/lib/telegram';
import type { AdminNotice } from './adminEvents';

/** True when a new row was stored; false for a duplicate, an error, or no database. */
export async function notifyAdmins(n: AdminNotice): Promise<boolean> {
  try {
    const sb = getSupabaseAdmin();
    if (!sb) return false;
    const row = {
      kind: n.kind,
      severity: n.severity,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
      dedupe_key: n.dedupeKey ?? null,
    };
    const table = sb.from('admin_notifications');
    const res = n.dedupeKey
      ? await table.upsert(row, { onConflict: 'dedupe_key', ignoreDuplicates: true }).select('id')
      : await table.insert(row).select('id');
    if (res.error) {
      logger.error('ADMIN', `notifyAdmins insert failed: ${res.error.message}`);
      return false;
    }
    if (!res.data?.length) return false;

    if (n.severity === 'high') {
      const text = `*${escapeTelegramMarkdownV2(n.title)}*${n.body ? `\n${escapeTelegramMarkdownV2(n.body)}` : ''}`;
      await sendTelegramMessage(text).catch(() => false);
    }
    return true;
  } catch (e) {
    logger.error('ADMIN', `notifyAdmins threw: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}
