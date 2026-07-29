'use client';

/**
 * WordClubCard - Landing page card showing club weekly leaderboard.
 * Shows club name, top 5 members by weekly XP, current user highlighted.
 * No club: "Create Club" or "Join Club" CTA.
 * Neo-brutalist: border-neo-cyan, shadow-hard, Users icon.
 */

import React, { memo, useCallback } from 'react';
import { Users, Plus, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWordClubs } from '@/hooks/useWordClubs';
import { cn } from '@/lib/utils';
import type { WordClubMember } from '@/shared/types/growth';

const MAX_LEADERBOARD = 5;

function MemberRow({
  member,
  rank,
  isCurrentUser,
}: {
  member: WordClubMember;
  rank: number;
  isCurrentUser: boolean;
}) {
  return (
    <div
      data-testid={`club-member-${member.userId}`}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-neo',
        isCurrentUser && 'bg-neo-cyan/10 border border-neo-cyan/30'
      )}
    >
      {/* Rank */}
      <span
        className={cn(
          'shrink-0 w-5 text-center text-xs font-bold',
          rank === 1 && 'text-neo-yellow',
          rank === 2 && 'text-neo-white',
          rank === 3 && 'text-neo-orange',
          rank > 3 && 'text-neo-white'
        )}
      >
        {rank}
      </span>

      {/* Name */}
      <span
        className={cn(
          'flex-1 text-sm truncate',
          isCurrentUser ? 'font-bold text-neo-cyan' : 'text-neo-white'
        )}
      >
        {member.displayName ?? member.userId.slice(0, 8)}
      </span>

      {/* Weekly XP */}
      <span className="shrink-0 text-xs font-bold text-neo-yellow">
        {member.weeklyXp.toLocaleString()} XP
      </span>
    </div>
  );
}

export const WordClubCard: React.FC = memo(function WordClubCard() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  const { currentClub: club, members, loading } = useWordClubs();
  const currentUserId = user?.id;

  const handleCreateClub = useCallback(() => {
    router.push('/clubs/create');
  }, [router]);

  const handleJoinClub = useCallback(() => {
    router.push('/clubs/browse');
  }, [router]);

  if (loading) return null;

  // No club — show CTA
  if (!club) {
    return (
      <div
        data-testid="word-club-card"
        role="region"
        aria-label={t('wordClub.ariaLabel')}
        className={cn(
          'border-neo border-neo-cyan rounded-neo p-4',
          'bg-neo-navy shadow-hard-sm',
          'flex flex-col gap-3'
        )}
      >
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-neo-cyan" aria-hidden="true" />
          <h3 className="font-neo-display text-lg text-neo-white">
            {t('wordClub.title')}
          </h3>
        </div>
        <p className="text-sm text-neo-white">{t('wordClub.emptyDesc')}</p>
        <div className="flex gap-2">
          <button
            data-testid="create-club-btn"
            onClick={handleCreateClub}
            className={cn(
              'flex-1 py-2 rounded-neo font-bold text-sm',
              'bg-neo-cyan text-neo-navy border-neo shadow-hard-sm',
              'hover:shadow-hard-pressed active:translate-y-0.5',
              'flex items-center justify-center gap-1'
            )}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('wordClub.create')}
          </button>
          <button
            data-testid="join-club-btn"
            onClick={handleJoinClub}
            className={cn(
              'flex-1 py-2 rounded-neo font-bold text-sm',
              'bg-neo-white/10 text-neo-white border-neo shadow-hard-sm',
              'hover:shadow-hard-pressed active:translate-y-0.5',
              'flex items-center justify-center gap-1'
            )}
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            {t('wordClub.join')}
          </button>
        </div>
      </div>
    );
  }

  const topMembers = (members ?? [])
    .sort((a, b) => b.weeklyXp - a.weeklyXp)
    .slice(0, MAX_LEADERBOARD);

  return (
    <div
      data-testid="word-club-card"
      role="region"
      aria-label={t('wordClub.ariaLabel')}
      className={cn(
        'border-neo border-neo-cyan rounded-neo p-4',
        'bg-neo-navy shadow-hard-sm',
        'flex flex-col gap-3'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-neo-cyan" aria-hidden="true" />
          <h3 className="font-neo-display text-lg text-neo-white truncate">
            {club.name}
          </h3>
        </div>
        {/* Weekly reset countdown could be added here */}
      </div>

      {/* Leaderboard */}
      <div className="flex flex-col gap-1" role="list" aria-label={t('wordClub.leaderboard')}>
        {topMembers.map((member, i) => (
          <MemberRow
            key={member.userId}
            member={member}
            rank={i + 1}
            isCurrentUser={member.userId === currentUserId}
          />
        ))}
      </div>

      {/* Member count */}
      <p className="text-xs text-neo-white text-center">
        {t('wordClub.memberCount', { count: String(club.memberCount) })}
      </p>
    </div>
  );
});

export default WordClubCard;
