'use client';

import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

const K = 'education.student.join';

export function JoinWaitingCard({ name }: { name?: string }) {
  const { t } = useLanguage();
  const { profile } = useAuth();

  return (
    <div className="flex flex-col items-center gap-3 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 text-center shadow-hard">
      <Avatar customAvatar={profile?.avatar_config ?? null} userId={name} size="2xl" />
      {name && (
        <p data-testid="join-waiting-name" className="font-neo-display text-3xl font-black text-neo-white lg:text-4xl">
          {name}
        </p>
      )}
      <p className="font-neo-body text-base font-bold text-neo-cyan lg:text-lg">
        {t(`${K}.flow.youreIn`)}
      </p>
    </div>
  );
}

export default JoinWaitingCard;
