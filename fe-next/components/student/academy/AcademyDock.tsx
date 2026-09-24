'use client';

/**
 * Bottom dock: everything that is not "play now", one tap away — one painted
 * plaque with illustrated icon medallions, not a row of flat outline tiles.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BookOpen, Sparkles, Trophy, User, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InkPanel, Medallion, INK_TEXT, type Tone } from './chrome';

interface Props {
  locale: string;
  reviewCount: number;
  onOpenClass?: () => void;
  /** Secondary solo practice — only when the hero is not already solo. */
  onSolo?: () => void;
}

const ITEM =
  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[12px] px-0.5 py-1 font-neo-display text-[10px] leading-none font-black uppercase tracking-wide text-neo-white outline-none transition-transform active:translate-y-[2px] focus-visible:ring-2 focus-visible:ring-neo-yellow sm:text-[11px]';

function Item({ tone, icon, label, badge }: { tone: Tone; icon: ReactNode; label: string; badge?: ReactNode }) {
  return (
    <>
      <Medallion tone={tone} size={30} shadow={2}>
        {icon}
      </Medallion>
      <span dir="auto" className={`max-w-full truncate ${INK_TEXT}`}>{label}</span>
      {badge}
    </>
  );
}

export function AcademyDock({ locale, reviewCount, onOpenClass, onSolo }: Props) {
  const { t } = useLanguage();
  const icon = 'h-4 w-4 text-neo-black';
  return (
    <InkPanel as="nav" tone="night" aria-label={t('academy.student.dockLabel', 'Academy')} className="flex h-[70px] items-stretch gap-0.5 px-1 py-1">
      <Link href={`/${locale}/student/lessons`} data-testid="academy-dock-lessons" className={ITEM}>
        <Item
          tone="teal"
          icon={<BookOpen className={`${icon} fill-neo-cream`} strokeWidth={2.5} />}
          label={t('academy.student.dockLessons', 'Lessons')}
          badge={
            reviewCount > 0 ? (
              <span className="absolute -top-2 end-1" aria-label={t('academy.student.reviewDueAria', '{count} words to review', { count: reviewCount })}>
                <Medallion tone="pink" size={20} shadow={1}>
                  <span className="font-neo-display text-[10px] font-black leading-none text-neo-white">{reviewCount}</span>
                </Medallion>
              </span>
            ) : undefined
          }
        />
      </Link>
      {onOpenClass && (
        <button type="button" onClick={onOpenClass} data-testid="academy-dock-class" className={ITEM}>
          <Item tone="lime" icon={<Users className={`${icon} fill-neo-cream`} strokeWidth={2.5} />} label={t('academy.student.dockClass', 'Class')} />
        </button>
      )}
      {onSolo && (
        <button
          type="button"
          onClick={onSolo}
          data-testid="academy-solo"
          aria-label={t('student.dashboard.soloPractice', 'Solo Practice')}
          className={ITEM}
        >
          <Item tone="plum" icon={<Sparkles className={`${icon} fill-neo-yellow`} strokeWidth={2.5} />} label={t('academy.student.solo', 'Solo')} />
        </button>
      )}
      <Link href={`/${locale}/student/achievements`} data-testid="academy-dock-awards" className={ITEM}>
        <Item tone="gold" icon={<Trophy className={`${icon} fill-neo-yellow`} strokeWidth={2.5} />} label={t('teacher.nav.studentAchievements', 'Awards')} />
      </Link>
      <Link href={`/${locale}/student/profile`} data-testid="academy-dock-me" className={ITEM}>
        <Item tone="pink" icon={<User className={`${icon} fill-neo-cream`} strokeWidth={2.5} />} label={t('teacher.nav.me', 'Me')} />
      </Link>
    </InkPanel>
  );
}
