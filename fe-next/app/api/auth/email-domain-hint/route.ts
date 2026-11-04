import { NextResponse } from 'next/server';
import { promises as dns } from 'node:dns';
import { z } from 'zod';
import {
  applyDomain,
  emailDomain,
  looksLikeSchoolDomain,
  suggestConfirmedDomain,
  suggestLabelTypo,
} from '@/lib/auth/emailDomainHint';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * POST /api/auth/email-domain-hint (t_9eb9ad5f)
 *
 * Unauthenticated on purpose: the typo happens before an account exists.
 * Returns at most one suggested address, never the confirmed-domain list.
 * MX false only for a definitive NXDOMAIN / no-data — a DNS timeout must
 * not warn every signup when this host cannot resolve.
 */

const bodySchema = z.object({ email: z.string().max(320) });

let cache: { at: number; domains: string[] } | null = null;
const CACHE_MS = 10 * 60 * 1000;

async function knownDomains(): Promise<string[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.domains;
  const admin = createAdminClient();
  if (!admin) return cache?.domains ?? [];
  const { data, error } = await admin.rpc('confirmed_email_domains', { p_limit: 400 });
  if (error || !Array.isArray(data)) return cache?.domains ?? [];
  const domains = data
    .map((row: { domain?: string }) => row.domain)
    .filter((d): d is string => typeof d === 'string' && d.includes('.'));
  cache = { at: Date.now(), domains };
  return domains;
}

async function hasMx(domain: string): Promise<boolean | null> {
  try {
    const rows = await dns.resolveMx(domain);
    return rows.length > 0;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ESERVFAIL') return false;
    return null;
  }
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const domain = emailDomain(parsed.data.email);
  if (!domain) {
    return NextResponse.json({ ok: true, suggestion: null, mx: null, school: false });
  }

  const [mx, known] = await Promise.all([
    hasMx(domain),
    knownDomains().catch(() => [] as string[]),
  ]);

  const fromConfirmed = suggestConfirmedDomain(domain, known);
  const fromLabel = mx === false ? suggestLabelTypo(domain) : null;
  const suggestedDomain = fromConfirmed || fromLabel;
  const suggestion = suggestedDomain ? applyDomain(parsed.data.email, suggestedDomain) : null;

  return NextResponse.json({
    ok: true,
    suggestion,
    mx,
    school: looksLikeSchoolDomain(suggestedDomain || domain),
  });
}
