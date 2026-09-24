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
  /** Desktop: bigger medallions and labels. */
  big?: boolean;
}

// Icon over a short label. Labels are never uppercased (Hebrew/Japanese have no
// case, and "UTMÄRKELSER" is a third wider than "Utmärkelser") and may wrap to
// two lines instead of being clipped — every locale fits at 390px.
const ITEM =
  'relative flex min-w-0 flex-1 flex-col items-center justify-start gap-0.5 rounded-[12px] px-0.5 pt-1 font-neo-display text-[11px] leading-[1.05] font-black text-neo-white outline-none transition-transform active:translate-y-[2px] focus-visible:ring-2 focus-visible:ring-neo-yellow';

function Item({ tone, icon, label, badge, big }: { tone: Tone; icon: ReactNode; label: string; badge?: ReactNode; big?: boolean }) {
  return (
    <>
      <Medallion tone={tone} size={big ? 42 : 30} shadow={2}>
        {icon}
      </Medallion>
      <span
        dir="auto"
        data-testid="academy-dock-label"
        // Auto-shrink: a long single word (sv "Utmärkelser", es "Lecciones")
        // steps down a size rather than breaking mid-word.
        className={`line-clamp-2 max-w-full break-words text-center ${big ? 'text-sm' : label.length > 9 ? 'text-[9.5px] tracking-tight' : ''} ${INK_TEXT}`}
      >
        {label}
      </span>
      {badge}
    </>
  );
}

export function AcademyDock({ locale, reviewCount, onOpenClass, onSolo, big = false }: Props) {
  const { t } = useLanguage();
  const icon = big ? 'h-5 w-5 text-neo-black' : 'h-4 w-4 text-neo-black';
  return (
    <InkPanel as="nav" tone="night" aria-label={t('academy.student.dockLabel', 'Academy')} className={`flex items-stretch gap-0.5 px-1 py-1 ${big ? 'h-[92px] px-2 py-2' : 'h-[72px]'}`}>
      <Link href={`/${locale}/student/lessons`} data-testid="academy-dock-lessons" className={ITEM}>
        <Item
          big={big}
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
          <Item big={big} tone="lime" icon={<Users className={`${icon} fill-neo-cream`} strokeWidth={2.5} />} label={t('academy.student.dockClass', 'Class')} />
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
          <Item big={big} tone="plum" icon={<Sparkles className={`${icon} fill-neo-yellow`} strokeWidth={2.5} />} label={t('academy.student.solo', 'Solo')} />
        </button>
      )}
      <Link href={`/${locale}/student/achievements`} data-testid="academy-dock-awards" className={ITEM}>
        <Item big={big} tone="gold" icon={<Trophy className={`${icon} fill-neo-yellow`} strokeWidth={2.5} />} label={t('teacher.nav.studentAchievements', 'Awards')} />
      </Link>
      <Link href={`/${locale}/student/profile`} data-testid="academy-dock-me" className={ITEM}>
        <Item big={big} tone="pink" icon={<User className={`${icon} fill-neo-cream`} strokeWidth={2.5} />} label={t('teacher.nav.me', 'Me')} />
      </Link>
    </InkPanel>
  );
}
