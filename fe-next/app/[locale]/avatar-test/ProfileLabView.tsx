'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Edit, Gem, LayoutDashboard, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCollectionProgress } from '@/lib/avatar/unlocks';
import { scoreTier } from '@/lib/seasons/scoreTier';
import { getXpProgress } from '@/backend/modules/xpManager';
import { ShowcaseStage } from '@/components/profile/showcase/ShowcaseStage';
import { ProfileShowcaseLayout, type ShowcaseTab } from '@/components/profile/showcase/ProfileShowcaseLayout';
import { PinnedHighlights } from '@/components/profile/showcase/PinnedHighlights';
import { AvatarCollectionCard } from '@/components/profile/showcase/AvatarCollectionCard';
import { friendlyDisplayName } from '@/components/profile/showcase/profileShowcaseModel';
import { ProfileStatsGrid } from '@/components/profile/ProfileStatsGrid';
import { ProfileAchievements } from '@/components/profile/ProfileAchievements';
import { ProfileAchievementsPublic } from '@/components/profile/ProfileAchievementsPublic';
import { fixtureHeadlineStats, fixtureProfileForLevel, parseProfileLabKnobs, type ProfileLabKnobs } from './profileLabFixtures';

const SECTIONS = [
  { id: 'overview', Icon: LayoutDashboard },
  { id: 'stats', Icon: BarChart3 },
  { id: 'achievements', Icon: Trophy },
  { id: 'collection', Icon: Gem },
] as const;

// Track B (profile) owns this file. Renders the REAL production showcase
// components (stage, tab layout, panels) with fixture data — no auth, no DB.
export function ProfileView({ level }: { level: number }) {
  const { t, language } = useLanguage();
  const [knobs, setKnobs] = useState<ProfileLabKnobs>({ isPublic: false, placeholderName: false });
  const [tab, setTab] = useState<string>('overview');
  useEffect(() => { setKnobs(parseProfileLabKnobs(window.location.search)); }, []);

  const profile = useMemo(() => fixtureProfileForLevel(level, knobs), [level, knobs]);
  const xp = getXpProgress(profile.total_xp ?? 0);
  const collection = getCollectionProgress([], level);
  const stats = fixtureHeadlineStats(profile, knobs.isPublic);
  const { name, isPlaceholder } = friendlyDisplayName(profile.display_name, profile.username);
  const noop = () => {};

  const stage = (
    <ShowcaseStage
      config={profile.avatar_config}
      name={name}
      isPlaceholderName={isPlaceholder}
      handle={knobs.isPublic && !isPlaceholder ? profile.username : null}
      countryCode={profile.country_code}
      level={level}
      levelPercent={40}
      isMaxLevel={xp.isMaxLevel}
      xpToNext={knobs.isPublic ? null : 120}
      rankTier={scoreTier(profile.total_score)}
      collection={collection}
      stats={stats}
      isOwn={!knobs.isPublic}
      onEditAvatar={noop}
      onEditName={noop}
      onShare={noop}
      onSettings={noop}
      avatarBadge={knobs.isPublic ? undefined : (
        // Same badge ProfileHeader puts on the avatar corner in production.
        <button type="button" onClick={noop} title={t('profile.chooseAvatar')} aria-label={t('profile.chooseAvatar')} className="absolute top-1 -inset-e-1 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-neo-pink border-2 border-neo-black shadow-hard-sm text-white">
          <Edit size={16} />
        </button>
      )}
      memberSince={knobs.isPublic ? null : new Date(profile.created_at!).toLocaleDateString(language, { year: 'numeric', month: 'short' })}
    />
  );

  if (knobs.isPublic) {
    return (
      <div data-testid="avatar-lab-view-profile" data-public="1" className="-mx-4 sm:-mx-8">
        <div className="w-full max-w-6xl mx-auto px-5 md:px-6 md:grid md:grid-cols-[minmax(340px,420px)_minmax(0,1fr)] md:gap-8">
          <div className="md:self-start">{stage}</div>
          <div className="min-w-0 mt-6 md:mt-0 flex flex-col gap-4">
            <ProfileAchievementsPublic counts={profile.achievement_counts} />
          </div>
        </div>
      </div>
    );
  }

  const tabs: ShowcaseTab[] = SECTIONS.map(s => ({ id: s.id, Icon: s.Icon, label: t(`profile.sections.${s.id}`) }));
  return (
    <div data-testid="avatar-lab-view-profile" className="-mx-4 sm:-mx-8">
      <ProfileShowcaseLayout stage={stage} tabs={tabs} activeTab={tab} onTabChange={setTab} isRtl={language === 'he'}>
        {tab === 'overview' && <PinnedHighlights counts={profile.achievement_counts} onSeeAll={() => setTab('achievements')} />}
        {tab === 'stats' && <ProfileStatsGrid profile={profile} isDarkMode />}
        {tab === 'achievements' && <ProfileAchievements profile={profile} isDarkMode />}
        {tab === 'collection' && <AvatarCollectionCard progress={collection} level={level} onEditAvatar={noop} />}
      </ProfileShowcaseLayout>
    </div>
  );
}
