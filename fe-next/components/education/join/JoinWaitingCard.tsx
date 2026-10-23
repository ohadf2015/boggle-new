'use client';

import Avatar from '@/components/Avatar';
import { Pop } from '@/components/education/motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export function JoinWaitingCard({ name }: { name?: string }) {
  const { t } = useLanguage();
  const { profile } = useAuth();

  return (
    <div className="flex flex-col items-center gap-3 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 text-center shadow-hard">
      <Pop>
        <Avatar customAvatar={profile?.avatar_config ?? null} userId={name} size="2xl" />
      </Pop>
      {name && (
        <p data-testid="join-waiting-name" className="font-neo-display text-3xl font-black text-neo-white lg:text-4xl">
          {name}
        </p>
      )}
      <p className="font-neo-body text-base font-bold text-neo-cyan lg:text-lg">
        {t('eduLiveRoom.student.watchBoard')}
      </p>
    </div>
  );
}

export default JoinWaitingCard;
