'use client';

/**
 * StudentHubPlayZone — Play zone for student hub (Zone 1)
 *
 * Three cards: "Play with Class", "Solo Practice", and "Quick Duel".
 *
 * The live-game banner used to live here. It was hoisted to the page itself: when the
 * teacher's game is running that is the only thing that matters, and inside this zone it sat
 * below the header and three sibling cards.
 *
 * Solo Practice is unconditional — it works with no teacher setup,
 * no active game, and no classmates. This ensures students always
 * have a playable action available.
 */

import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Swords, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PlayWithClassButton } from '@/components/student/PlayWithClassButton';

interface StudentHubPlayZoneProps {
  classroomId: string;
  userId: string;
  username: string;
}

const cardSpring = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
};

export function StudentHubPlayZone({ classroomId, userId, username }: StudentHubPlayZoneProps) {
  const { t, language } = useLanguage();
  const router = useRouter();

  return (
    <section aria-label={t('student.hub.playZone')}>
      <h2 className="text-lg font-neo-display font-black text-neo-lime mb-3 uppercase tracking-wide">
        {t('student.hub.playZone')}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <PlayWithClassButton
          classroomId={classroomId}
          userId={userId}
          username={username}
        />

        <m.button
          onClick={() => router.push(`/${language}/quick-play`)}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={cardSpring}
          className="relative rounded-neo border-neo border-black shadow-hard-lg bg-neo-cyan p-4 sm:p-6 text-left"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-neo border-3 border-black bg-black flex items-center justify-center shadow-hard-sm">
              <Sparkles className="w-7 h-7 text-neo-cyan" />
            </div>
            <h3 className="text-xl font-neo-display font-black text-black text-center">
              {t('student.dashboard.soloPractice')}
            </h3>
            <p className="text-sm font-neo-body font-bold text-black/60 text-center">
              {t('student.dashboard.soloPracticeDesc')}
            </p>
          </div>
        </m.button>

        <m.button
          onClick={() => router.push(`/${language}/education/duels?classroomId=${classroomId}`)}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={cardSpring}
          className="relative rounded-neo border-neo border-black shadow-hard-lg bg-neo-pink p-4 sm:p-6 text-left"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-neo border-3 border-black bg-black flex items-center justify-center shadow-hard-sm">
              <Swords className="w-7 h-7 text-neo-pink" />
            </div>
            <h3 className="text-xl font-neo-display font-black text-black text-center">
              {t('student.dashboard.quickDuel')}
            </h3>
            <p className="text-sm font-neo-body font-bold text-black/60 text-center">
              {t('student.dashboard.challengeClassmate')}
            </p>
          </div>
        </m.button>
      </div>
    </section>
  );
}
