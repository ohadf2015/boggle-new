import { notFound } from 'next/navigation';
import type { Locale } from '@/lib/blast/v2/types';
import BlastLegacyPageClient from './legacy/PageClient';

const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

/**
 * Public Blast route — ALWAYS V1, for every player, permanently.
 *
 * V1 (legacy) is the only player-facing Blast engine and the one used in
 * multiplayer, so single-player and multiplayer stay in parity. There is no
 * `?v2` toggle here by design: Blast V2 lives at its own admin-only route
 * (`/blast/v2`) and must never override the public V1 experience.
 */
export default async function BlastPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!VALID_LOCALES.includes(rawLocale as Locale)) {
    notFound();
  }
  return <BlastLegacyPageClient />;
}
