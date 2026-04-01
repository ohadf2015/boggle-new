'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { DuelGameView, RealTimeDuelGame } from '@/components/education/duels';
import { cn } from '@/lib/utils';
import { getDuelById } from '@/lib/supabase/education/duels';
import { getProfile } from '@/lib/supabase';

/**
 * Duel Game Page Client
 *
 * Individual duel gameplay page.
 * Students play a specific duel and submit their score.
 */
export default function DuelGamePageClient({ duelId }: { duelId: string }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';

  const [isChecking, setIsChecking] = useState(true);
  const [duelError, setDuelError] = useState<string | null>(null);
  const [duelType, setDuelType] = useState<'async' | 'realtime'>('async');
  const [opponentName, setOpponentName] = useState<string>('');

  // Verify duel exists and user is a participant
  useEffect(() => {
    const verifyDuel = async () => {
      if (authLoading) return;

      if (!isAuthenticated || !user) {
        router.push(`/${language}/education`);
        return;
      }

      // Verify duel exists and user is participant
      const { data: duel, error } = await getDuelById(duelId);

      if (error || !duel) {
        setDuelError(t('duelNotFound'));
        setIsChecking(false);
        return;
      }

      // Check if user is a participant
      const isParticipant =
        duel.challenger_id === user.id || duel.opponent_id === user.id;

      if (!isParticipant) {
        setDuelError(t('notParticipant'));
        setIsChecking(false);
        return;
      }

      // Set duel type and opponent name
      setDuelType(duel.duel_type || 'async');
      const opponentId = duel.challenger_id === user.id ? duel.opponent_id : duel.challenger_id;
      const { data: opponentProfile } = await getProfile(opponentId, 'minimal');
      setOpponentName(opponentProfile?.display_name || t('common.opponent'));

      setIsChecking(false);
    };

    verifyDuel();
  }, [duelId, isAuthenticated, authLoading, router, language, user, t]);

  const handleBackToLobby = useCallback(() => {
    router.push(`/${language}/education/duels`);
  }, [router, language]);

  if (isChecking || authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-dvh">
        <PageLoader
          size="lg"
          text={t('common.loading')}
        />
      </div>
    );
  }

  if (duelError) {
    return (
      <div className={cn('flex-1 flex flex-col bg-neo-navy w-full min-h-dvh', isRTL && 'rtl')}>
        <EducationHeader showBackButton title={t('duelsTitle')} />

        <main className="flex-1 flex items-center justify-center px-4">
          <div
            className={cn(
              'p-8 rounded-neo border-3 border-neo-black',
              'bg-neo-navy/80 shadow-hard-sm text-center max-w-md'
            )}
          >
            <p className="text-neo-white text-xl font-bold mb-4">{duelError}</p>
            <button
              onClick={handleBackToLobby}
              className={cn(
                'px-6 py-3 font-bold rounded-neo',
                'bg-neo-lime text-neo-black',
                'border-3 border-neo-black shadow-hard-sm',
                'hover:shadow-hard transition-all'
              )}
            >
              {t('backToLobby')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full min-h-dvh', isRTL && 'rtl')}>
      <EducationHeader showBackButton title={t('duelsTitle')} />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {duelType === 'realtime' ? (
          <RealTimeDuelGame
            duelId={duelId}
            studentId={user!.id}
            opponentName={opponentName}
            onBackToLobby={handleBackToLobby}
          />
        ) : (
          <DuelGameView
            duelId={duelId}
            studentId={user!.id}
            onBackToLobby={handleBackToLobby}
          />
        )}
      </main>
    </div>
  );
}
