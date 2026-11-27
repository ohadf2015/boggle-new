import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CAMPAIGN_SUBSCRIPTION_COLUMN,
  isUnsubscribedFromCampaigns,
} from "@/lib/email";

export interface CampaignRecipient {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  timezone: string | null;
  country_code: string | null;
  language: string | null;
  email_unsubscribe_token: string | null;
}

export type CampaignAudience =
  | { ok: true; recipients: CampaignRecipient[]; registeredEmails: Set<string> }
  | { ok: false; error: string };

const AUTH_PAGE_SIZE = 50;
const MAX_AUTH_PAGES = 400;

export async function loadCampaignRecipients(
  admin: SupabaseClient,
): Promise<CampaignAudience> {
  const { data: players, error } = await admin
    .from("profiles")
    .select(
      `id, display_name, username, timezone, country_code, language, email_unsubscribe_token, is_test_account, ${CAMPAIGN_SUBSCRIPTION_COLUMN}`,
    )
    .neq(CAMPAIGN_SUBSCRIPTION_COLUMN, false);
  if (error)
    return { ok: false, error: `Failed to fetch players: ${error.message}` };

  const emailById = new Map<string, string>();
  for (let page = 1; page <= MAX_AUTH_PAGES; page++) {
    const { data, error: listError } = await admin.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });
    if (listError)
      return {
        ok: false,
        error: `Failed to list auth users: ${listError.message}`,
      };
    const users = data?.users ?? [];
    for (const u of users) if (u.email) emailById.set(u.id, u.email);
    if (users.length < AUTH_PAGE_SIZE) break;
  }

  const recipients = (
    (players ?? []) as Array<
      Omit<CampaignRecipient, "email"> & {
        is_test_account?: boolean | null;
        daily_email_subscribed?: boolean | null;
      }
    >
  )
    .filter(
      (p) =>
        emailById.has(p.id) &&
        !p.is_test_account &&
        !isUnsubscribedFromCampaigns(p),
    )
    .map((p) => ({
      id: p.id,
      email: emailById.get(p.id)!,
      display_name: p.display_name ?? null,
      username: p.username ?? null,
      timezone: p.timezone ?? null,
      country_code: p.country_code ?? null,
      language: p.language ?? null,
      email_unsubscribe_token: p.email_unsubscribe_token ?? null,
    }));
  return {
    ok: true,
    recipients,
    registeredEmails: new Set(emailById.values()),
  };
}

export async function ensureUnsubscribeToken(
  admin: SupabaseClient,
  recipient: Pick<CampaignRecipient, "id" | "email_unsubscribe_token">,
  mint: () => string,
): Promise<string> {
  if (recipient.email_unsubscribe_token)
    return recipient.email_unsubscribe_token;
  const token = mint();
  const { error } = await admin
    .from("profiles")
    .update({ email_unsubscribe_token: token })
    .eq("id", recipient.id);
  if (error)
    throw new Error(
      `could not save unsubscribe token for ${recipient.id}: ${error.message}`,
    );
  return token;
}
