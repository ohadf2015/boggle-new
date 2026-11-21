/**
 * Student Profile ("Me"): level, XP and a first step, in the Academy frame
 * (same plaque and dock as Lessons and Awards).
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { EducationBadgeGrid, type StudentAchievement } from '@/components/education';
import { AcademyPageFrame, FrameSkeleton } from '@/components/student/pages/AcademyPageFrame';
import { useStudentSubpageGuard } from '@/components/student/pages/useStudentSubpageGuard';
import { nextOpenAssignment } from '@/components/student/nextOpenAssignment';
import { Medallion, INK_TEXT, toneStyle } from '@/components/student/academy/chrome';
import { pressClasses } from '@/components/education/motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { getXpProgress } from '@/backend/modules/xpManager';
import { transformAchievementRow } from './achievementTransform';
import { summarizeAwards } from '../achievements/awardsSummary';
import { useAwardsRecord } from '../achievements/useAwardsRecord';
import { ProfileXpBar } from './ProfileXpBar';
import Avatar from '@/components/Avatar';
import { StreakFlame } from '@/components/streak/StreakFlame';

type T = (k: string, fallback?: string, params?: Record<string, unknown>) => string;

const CARD = 'rounded-[18px] border-3 border-neo-black p-4 sm:p-5';
const STAT = 'rounded-[14px] border-2 border-neo-black/60 bg-neo-black/30 p-3';

export default function StudentProfilePageClient() {
  const { profile } = useAuth();
  const { t: rawT, language } = useLanguage();
  const t = rawT as unknown as T;
  const { status, user } = useStudentSubpageGuard(language);
  const userId = user?.id ?? null;
  const [achievements, setAchievements] = useState<StudentAchievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
  const { lessons, isLoading: isLoadingProgress } = useStudentProgress();
  const awards = useAwardsRecord(userId);

  const rows = lessons.flatMap((l) => (l.progress ? [l.progress] : []));
  const totalXp = rows.reduce((sum, p) => sum + (p.total_xp || 0), 0);
  const currentStreak = rows.reduce((max, p) => Math.max(max, p.current_streak || 0), 0);
  const wordsFound = rows.reduce((sum, p) => sum + (p.words_mastered?.length || 0), 0);
  const sessions = rows.reduce((sum, p) => sum + (p.total_practice_sessions || 0), 0);
  const xpProgress = getXpProgress(totalXp);
  const currentLevel = xpProgress.currentLevel;
  const nextHref = nextOpenAssignment(lessons, language)?.href ?? `/${language}/student/lessons`;

  useEffect(() => {
    if (!userId || !supabase) {
      setIsLoadingAchievements(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('student_achievements')
          .select(`
            id,
            student_id,
            current_tier,
            progress_value,
            is_pinned,
            unlocked_at,
            achievement_definitions!inner (
              key,
              category,
              icon,
              is_secret,
              achievement_tiers (
                tier,
                threshold,
                tier_order
              )
            )
          `)
          .eq('student_id', userId);
        if (error) {
          logger.error('Error fetching achievements:', error);
        } else if (!cancelled) {
          setAchievements((data || []).map((row) =>
            transformAchievementRow({
              current_tier: row.current_tier,
              progress_value: row.progress_value || 0,
              is_pinned: row.is_pinned || false,
              achievement_definitions: row.achievement_definitions as unknown as Parameters<typeof transformAchievementRow>[0]['achievement_definitions'],
            }),
          ));
        }
      } catch (error) {
        logger.error('Error in fetchAchievements:', error);
      }
      if (!cancelled) setIsLoadingAchievements(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const next = useMemo(() => (awards ? summarizeAwards(awards).next : null), [awards]);
  const ready = status === 'ready';
  const fresh = isLoadingProgress === false && sessions === 0 && totalXp === 0;

  return (
    <AcademyPageFrame
      title={t('teacher.nav.me', 'Me')}
      art="/images/education/words-mastered.webp"
      regionLabel={t('student.dashboard.title')}
      pending={!ready}
      busy={ready && (isLoadingProgress || isLoadingAchievements)}
    >
      {!ready ? (
        <FrameSkeleton rows={3} />
      ) : (
        <div data-testid="student-profile-content" className="flex flex-col gap-3">
          <div className={cn(CARD, 'flex flex-col gap-4')} style={toneStyle('plum', { shadow: 3, trim: 2 })}>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar
                customAvatar={profile?.avatar_config ?? null}
                userId={user?.id}
                pixelSize={72}
                className="shrink-0 rounded-full border-3 border-neo-black shadow-hard"
              />
              <div className="min-w-0 flex-1">
                <h1 dir="auto" className={cn('line-clamp-2 break-words font-neo-display text-2xl font-black text-neo-white sm:text-3xl', INK_TEXT)}>
                  {profile?.display_name || profile?.username || t('common.guest')}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-neo border-2 border-neo-black bg-neo-lime px-3 py-1 font-neo-display text-sm font-bold text-neo-black shadow-hard-sm">
                    {t('education.xp.level')} {currentLevel}
                  </span>
                  <span className="rounded-neo border-2 border-neo-black bg-neo-cyan px-3 py-1 font-neo-display text-sm font-bold tabular-nums text-neo-black shadow-hard-sm">
                    {totalXp} {t('education.xp.totalXp')}
                  </span>
                  {currentStreak > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-orange px-3 py-1 font-neo-display text-sm font-bold tabular-nums text-neo-black shadow-hard-sm">
                      <StreakFlame days={currentStreak} size={18} />
                      {currentStreak} {t('education.xp.streak')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-neo-cream/20 pt-3">
              <ProfileXpBar xp={xpProgress} level={currentLevel} />
            </div>
          </div>

          {isLoadingProgress ? (
            <div className="grid grid-cols-3 gap-2">
              {['a', 'b', 'c'].map((id) => <div key={id} className="h-16 rounded-[14px] bg-neo-white/10 motion-safe:animate-pulse" />)}
            </div>
          ) : fresh ? (
            <div data-testid="profile-first-step" className={cn(CARD, 'flex items-center gap-3')} style={toneStyle('night', { shadow: 3, trim: 2 })}>
              <Medallion tone="gold" size={48} shadow={2}><span className="text-2xl leading-none" aria-hidden="true">🚀</span></Medallion>
              <div className="min-w-0 flex-1">
                <p dir="auto" className={cn('font-neo-display text-lg font-black leading-tight text-neo-white', INK_TEXT)}>
                  {t('academy.pages.profileFirstTitle', 'Your first lesson starts your level')}
                </p>
                <p dir="auto" className="font-neo-body text-sm font-bold text-neo-white/85">
                  {t('academy.pages.profileFirstBody', 'Play one round and your XP, words and awards show up here.')}
                </p>
              </div>
              <Link
                href={nextHref}
                className={cn(pressClasses(2), 'inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-lime px-4 font-neo-display text-sm font-black uppercase text-neo-black')}
              >
                <Play className="size-4 rtl:-scale-x-100" aria-hidden />
                {t('academy.pages.awardsEmptyCta', 'Play a lesson')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: t('education.student.lessonsAssigned'), value: lessons.length, tone: 'text-neo-white' },
                { label: t('education.practice.wordsFound'), value: wordsFound, tone: 'text-neo-lime' },
                { label: t('education.practice.complete'), value: sessions, tone: 'text-neo-cyan' },
              ].map((s) => (
                <div key={s.label} className={STAT}>
                  <div dir="auto" className="mb-1 font-neo-body text-xs font-bold uppercase tracking-wide text-neo-cream/70">{s.label}</div>
                  <div className={cn('font-neo-display text-3xl font-black tabular-nums', s.tone)}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {isLoadingAchievements ? (
            <div className="h-24 rounded-[18px] bg-neo-white/10 motion-safe:animate-pulse" />
          ) : achievements.length > 0 ? (
            <div className={CARD} style={toneStyle('night', { shadow: 3, trim: 2 })}>
              <EducationBadgeGrid studentId={user!.id} achievements={achievements} />
              <AllAwardsLink href={`/${language}/student/achievements`} label={t('student.dashboard.viewAll')} />
            </div>
          ) : (
            <div data-testid="profile-awards-teaser" className={cn(CARD, 'flex flex-col gap-3')} style={toneStyle('night', { shadow: 3, trim: 2 })}>
              <h2 className={cn('font-neo-display text-xl font-black text-neo-white', INK_TEXT)}>{t('student.dashboard.achievements')}</h2>
              <p dir="auto" className="font-neo-body text-sm font-bold text-neo-white/85">
                {next
                  ? t('academy.pages.profileNextAward', 'Closest award: {name}. {how}', { name: t(next.award.nameKey), how: t(next.award.descriptionKey) })
                  : t('academy.pages.profileNoAwardsYet', 'Win your first award by finishing a lesson.')}
              </p>
              <AllAwardsLink href={`/${language}/student/achievements`} label={t('student.dashboard.viewAll')} />
            </div>
          )}
        </div>
      )}
    </AcademyPageFrame>
  );
}

function AllAwardsLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        pressClasses(2),
        'mt-3 inline-flex min-h-11 items-center gap-1.5 self-start rounded-neo border-2 border-neo-cream/50 px-3 font-neo-display text-sm font-black text-neo-cyan',
      )}
    >
      <span>{label}</span>
      <DirectionalIcon icon={ArrowRight} className="size-4 shrink-0" />
    </Link>
  );
}
