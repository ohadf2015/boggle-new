import type { Metadata } from 'next';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadPublicProfileName } from '@/lib/players/loadPublicProfileName';
import { buildPlayerProfileMetadata } from '@/lib/players/profileMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  const name = await loadPublicProfileName(createAdminClient(), { id });
  return buildPlayerProfileMetadata({ locale, path: `/player/${id}`, name });
}

import PlayerProfilePageClient from './PageClient';

export const dynamic = 'force-dynamic';

export default function PlayerProfilePage() {
  return <PlayerProfilePageClient />;
}
