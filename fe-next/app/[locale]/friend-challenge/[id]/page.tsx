import { redirect, notFound } from 'next/navigation';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient as createSupabaseServerClient } from '@/utils/supabase/server';
import FriendChallengeLandingClient from './FriendChallengeLandingClient';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function FriendChallengePage({ params }: PageProps) {
  const { locale, id } = await params;

  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    redirect(`/${locale}/?login=1&next=/friend-challenge/${id}`);
  }

  const admin = createAdminClient();
  if (!admin) notFound();

  const { data: row, error } = await admin
    .from('async_board_challenges')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !row) notFound();

  const isChallenger = row.challenger_id === user.id;
  const isChallenged = row.challenged_id === user.id;
  if (!isChallenger && !isChallenged) notFound();

  if (row.status === 'expired_draft' && !isChallenger) notFound();

  // Resolve display names for both sides
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, display_name, avatar_image')
    .in('id', [row.challenger_id, row.challenged_id]);
  const byId = new Map<string, { name: string; avatar: string | null }>();
  (profiles ?? []).forEach((p: { id: string; username: string | null; display_name: string | null; avatar_image: string | null }) => {
    byId.set(p.id, {
      name: p.display_name || p.username || 'Friend',
      avatar: p.avatar_image,
    });
  });

  return (
    <FriendChallengeLandingClient
      locale={locale}
      challenge={{
        id: row.id,
        status: row.status,
        gameMode: row.game_mode,
        language: row.language,
        durationSeconds: row.duration_seconds,
        challengerId: row.challenger_id,
        challengerName: byId.get(row.challenger_id)?.name ?? 'Friend',
        challengerAvatar: byId.get(row.challenger_id)?.avatar ?? null,
        challengerScore: row.challenger_score,
        challengedId: row.challenged_id,
        challengedName: byId.get(row.challenged_id)?.name ?? 'Friend',
        challengedAvatar: byId.get(row.challenged_id)?.avatar ?? null,
        challengedScore: row.challenged_score,
        winnerUserId: row.winner_user_id,
        message: row.message,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }}
      viewerIsChallenger={isChallenger}
    />
  );
}
