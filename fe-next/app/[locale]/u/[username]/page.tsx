import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createAdminClient } from '@/utils/supabase/admin';
import { loadPublicProfileName } from '@/lib/players/loadPublicProfileName';
import { buildPlayerProfileMetadata } from '@/lib/players/profileMetadata';
import PublicProfilePageClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; username: string }> }): Promise<Metadata> {
  const { locale, username: raw } = await params;
  const username = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
  const name = await loadPublicProfileName(createAdminClient(), { username });
  return buildPlayerProfileMetadata({ locale, path: `/u/${encodeURIComponent(username)}`, name });
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-neo-navy min-h-screen flex items-center justify-center">
          <div className="animate-pulse bg-neo-navy/50 rounded-neo p-8 w-full max-w-md">
            <div className="h-20 w-20 rounded-full bg-neo-white/10 mx-auto mb-4" />
            <div className="h-4 bg-neo-white/10 rounded mb-3 w-3/4 mx-auto" />
            <div className="h-4 bg-neo-white/10 rounded w-1/2 mx-auto" />
          </div>
        </div>
      }
    >
      <PublicProfilePageClient username={username} />
    </Suspense>
  );
}
