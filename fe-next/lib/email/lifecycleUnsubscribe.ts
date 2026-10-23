import type { SupabaseClient } from '@supabase/supabase-js';
import { generateUnsubscribeToken, isUnsubscribedFromCampaigns } from '@/lib/email';
import { sendEmail } from '@/lib/email/send';
import type { TeacherLocale } from '@/lib/education/types';

const SITE = 'https://www.lexiclash.live';

const FOOTER: Record<TeacherLocale, { text: string; dir: 'ltr' | 'rtl' }> = {
  en: { text: 'Unsubscribe from teacher emails', dir: 'ltr' },
  he: { text: 'הסרה מרשימת התפוצה למורים', dir: 'rtl' },
  sv: { text: 'Avsluta prenumerationen på lärarmejl', dir: 'ltr' },
  ja: { text: '教師向けメールの配信を停止', dir: 'ltr' },
  es: { text: 'Darse de baja de los correos para docentes', dir: 'ltr' },
  ru: { text: 'Отписаться от писем для учителей', dir: 'ltr' },
};

export function lifecycleUnsubscribeUrl(token: string): string {
  return `${SITE}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function withUnsubscribeFooter(html: string, url: string, locale: TeacherLocale): string {
  const f = FOOTER[locale] ?? FOOTER.en;
  const footer = `<div dir="${f.dir}" style="text-align:center;padding:12px 16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9ca3af;"><a href="${url}" style="color:#9ca3af;text-decoration:underline;">${f.text}</a></div>`;
  const at = html.lastIndexOf('</body>');
  return at === -1 ? html + footer : html.slice(0, at) + footer + html.slice(at);
}

export interface LifecycleAudience {
  /** userId -> unsubscribe token, for users who may be emailed. */
  contacts: Map<string, string>;
  unsubscribed: Set<string>;
  /** No profile row, or no token could be stored: no working unsubscribe link, so no email. */
  unreachable: Set<string>;
}

interface ProfileRow {
  id: string;
  daily_email_subscribed: boolean | null;
  email_unsubscribe_token: string | null;
}

/** Throws on a failed lookup: an unknown opt-out must never become a send. */
export async function loadLifecycleAudience(
  db: SupabaseClient,
  userIds: readonly string[],
  { mint }: { mint: boolean },
): Promise<LifecycleAudience> {
  const audience: LifecycleAudience = { contacts: new Map(), unsubscribed: new Set(), unreachable: new Set() };
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return audience;

  const { data, error } = await db
    .from('profiles')
    .select('id, daily_email_subscribed, email_unsubscribe_token')
    .in('id', ids);
  if (error) throw new Error(`profiles select failed: ${error.message}`);

  const byId = new Map(((data ?? []) as ProfileRow[]).map((p) => [p.id, p]));
  for (const id of ids) {
    const profile = byId.get(id);
    if (!profile) {
      audience.unreachable.add(id);
    } else if (isUnsubscribedFromCampaigns(profile)) {
      audience.unsubscribed.add(id);
    } else if (profile.email_unsubscribe_token) {
      audience.contacts.set(id, profile.email_unsubscribe_token);
    } else if (!mint) {
      audience.contacts.set(id, '');
    } else {
      const token = generateUnsubscribeToken();
      const { error: writeError } = await db.from('profiles').update({ email_unsubscribe_token: token }).eq('id', id);
      if (writeError) audience.unreachable.add(id);
      else audience.contacts.set(id, token);
    }
  }
  return audience;
}

export type LifecycleReach = { token: string } | { skip: 'unsubscribed' | 'unreachable' };

/** One address may own several accounts; an opt-out on any of them covers the address. */
export function reachFor(audience: LifecycleAudience, userIds: ReadonlyArray<string | null | undefined>): LifecycleReach {
  const ids = userIds.filter((id): id is string => Boolean(id));
  if (ids.some((id) => audience.unsubscribed.has(id))) return { skip: 'unsubscribed' };
  for (const id of ids) {
    const token = audience.contacts.get(id);
    if (token !== undefined) return { token };
  }
  return { skip: 'unreachable' };
}

interface LifecycleSendArgs {
  to: string;
  subject: string;
  html: string;
  locale: TeacherLocale;
  token: string;
  replyTo?: string;
}

export function sendLifecycleEmail({ to, subject, html, locale, token, replyTo }: LifecycleSendArgs) {
  const url = lifecycleUnsubscribeUrl(token);
  return sendEmail({
    to,
    subject,
    html: withUnsubscribeFooter(html, url, locale),
    replyTo,
    headers: {
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}
