'use client';

import { memo } from 'react';
import Link from 'next/link';
import { PencilRuler } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface CreateBoardCTAProps {
  gamesPlayed: number;
  className?: string;
}

/**
 * CreateBoardCTA — Post-game nudge to create UGC content.
 * Only renders after 5+ games to avoid overwhelming new players.
 */
const CreateBoardCTA = memo<CreateBoardCTAProps>(({ gamesPlayed, className }) => {
  const { t, language } = useLanguage();

  if (gamesPlayed < 5) return null;

  return (
    <Link
      href={`/${language}/create/board`}
      className={cn(
        'flex items-center gap-3 p-3',
        'bg-neo-pink/10 border-2 border-neo-pink/30 rounded-neo',
        'hover:bg-neo-pink/20 hover:border-neo-pink/50',
        'transition-all duration-150',
        className
      )}
    >
      <div className="flex items-center justify-center w-10 h-10 bg-neo-pink/20 rounded-neo shrink-0">
        <PencilRuler className="w-5 h-5 text-neo-pink" />
      </div>
      <div>
        <p className="text-sm font-neo-display font-bold text-neo-white">
          {t('ugc.creator.makeYourOwn')}
        </p>
        <p className="text-xs text-neo-white font-neo-body">
          {t('ugc.createBoard')}
        </p>
      </div>
    </Link>
  );
});

CreateBoardCTA.displayName = 'CreateBoardCTA';

export default CreateBoardCTA;
