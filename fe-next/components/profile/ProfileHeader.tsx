'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit, Check, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { Input } from '@/components/ui/input';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import { AvatarCustomizeHint } from '@/components/profile/AvatarCustomizeHint';
import { useAvatarCustomizationNudge } from '@/hooks/useAvatarCustomizationNudge';
import { useAvatarHistory } from '@/hooks/useAvatarHistory';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import { useEquippedCosmetic } from '@/hooks/useEquippedCosmetic';
import { useEngagementStatus } from '@/hooks/useEngagementStatus';
import { CountrySelector } from '@/components/settings/CountrySelector';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlayerStyle } from '@/contexts/PlayerStyleContext';
import { scoreTier } from '@/lib/seasons/scoreTier';
import { getXpProgress } from '@/backend/modules/xpManager';
import { getCollectionProgress } from '@/lib/avatar/unlocks';
import { cn } from '@/lib/utils';
import type { ProfileData } from '@/contexts/auth/authTypes';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { ShowcaseStage } from '@/components/profile/showcase/ShowcaseStage';
import { AvatarCollectionCard } from '@/components/profile/showcase/AvatarCollectionCard';
import { useShareProfile } from '@/components/profile/showcase/useShareProfile';
import { friendlyDisplayName, getHeadlineStats } from '@/components/profile/showcase/profileShowcaseModel';

interface ProfileHeaderProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  /** Smaller avatar edit badge (kept for callers that render a compact header). */
  compact?: boolean;
  /** @deprecated No longer used — profile picture upload removed */
  isUploading?: boolean;
  /** @deprecated No longer used — profile picture upload removed */
  onProfilePictureUpload?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** @deprecated No longer used — profile picture upload removed */
  onRemoveProfilePicture?: () => Promise<void>;
  updateProfile: (updates: Partial<ProfileData>) => Promise<{ data: ProfileData | null; error: { message: string } | null }>;
  refreshProfile: () => Promise<void>;
  /** Gear button on the stage (the page jumps to account settings). */
  onOpenSettings?: () => void;
  /** DOM node in the Collection tab; the avatar collection card portals into it. */
  collectionSlot?: HTMLElement | null;
}

/**
 * Own-profile showcase stage (container). Owns everything that needs the
 * player's private data: avatar builder + save, name/country editing, premium
 * part ownership (collection count), streak. Renders the shared ShowcaseStage.
 */
export function ProfileHeader({
  profile,
  compact = false,
  updateProfile,
  refreshProfile,
  onOpenSettings,
  collectionSlot,
}: ProfileHeaderProps): React.ReactNode {
  const { t, language } = useLanguage();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingCountry, setIsEditingCountry] = useState(false);
  const [isSavingCountry, setIsSavingCountry] = useState(false);
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const avatarPremium = useAvatarPremium();
  const equippedFrame = useEquippedCosmetic('profileFrame');
  // Personal accent ring: only when the player picked a non-default style.
  const { style: playerStyle } = usePlayerStyle();
  const avatarNudge = useAvatarCustomizationNudge();
  // Persistent "previous avatar" so a save can always be reverted (even later).
  const { previousConfig: previousAvatar, stashCurrent: stashPreviousAvatar } =
    useAvatarHistory(profile?.id);
  // Streak lives in player_engagement, not on profile.
  const { streak: streakDays } = useEngagementStatus();

  const { name, isPlaceholder } = friendlyDisplayName(profile?.display_name, profile?.username);
  const share = useShareProfile({ username: profile?.username, name, isOwn: true });

  const startEditingName = (): void => {
    setEditDisplayName(isPlaceholder ? '' : name);
    setIsEditingName(true);
  };

  const handleSaveDisplayName = async (): Promise<void> => {
    if (!editDisplayName.trim() || editDisplayName.trim().length < 2) {
      toast.error(t('validation.usernameTooShort'));
      return;
    }
    if (editDisplayName.trim().length > 20) {
      toast.error(t('validation.usernameTooLong'));
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({ display_name: editDisplayName.trim() });
      await refreshProfile();
      setIsEditingName(false);
      toast.success(t('profile.saved'));
    } catch (err) {
      console.error('Save error:', err);
      toast.error(t('profile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSave = async (config: CustomAvatarConfig): Promise<void> => {
    try {
      // Stash the outgoing avatar as "previous" before overwriting it.
      const outgoing = profile?.avatar_config;
      if (outgoing && JSON.stringify(outgoing) !== JSON.stringify(config)) {
        stashPreviousAvatar(outgoing);
      }
      await updateProfile({ avatar_config: config });
      await refreshProfile();
      setIsAvatarBuilderOpen(false);
      toast.success(t('profile.saved'));
    } catch (err) {
      console.error('Save avatar error:', err);
      toast.error(t('profile.saveError'));
    }
  };

  const handleCountryChange = useCallback(async (countryCode: string | null): Promise<void> => {
    setIsSavingCountry(true);
    try {
      await updateProfile({ country_code: countryCode });
      await refreshProfile();
      setIsEditingCountry(false);
      toast.success(t('profile.countrySaved'));
    } catch (err) {
      console.error('Save country error:', err);
      toast.error(t('profile.countryError'));
    } finally {
      setIsSavingCountry(false);
    }
  }, [updateProfile, refreshProfile, t]);

  const openBuilder = useCallback(() => setIsAvatarBuilderOpen(true), []);

  const xp = getXpProgress(profile?.total_xp || 0);
  const level = xp.currentLevel;
  // Same level + ownership the editor's lock state uses (useAvatarPremium), so
  // the stage's "32/81" can never disagree with what the builder unlocks.
  const collection = useMemo(
    () => getCollectionProgress(avatarPremium.permanentUnlocks, avatarPremium.level ?? profile?.current_level),
    [avatarPremium.permanentUnlocks, avatarPremium.level, profile?.current_level],
  );
  const stats = getHeadlineStats({
    longestWord: profile?.longest_word,
    wins: (profile?.casual_wins ?? 0) + (profile?.ranked_wins ?? 0),
    streak: streakDays,
    games: profile?.total_games,
  });
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(language || undefined, { year: 'numeric', month: 'short' })
    : null;

  const nameEditor = isEditingName ? (
    <div className="flex items-center gap-2">
      <Input
        value={editDisplayName}
        onChange={(e) => setEditDisplayName(e.target.value)}
        className="h-11 text-lg font-bold bg-neo-navy-elevated border-2 border-neo-black"
        maxLength={20}
        autoFocus
        aria-label={t('profile.editName')}
      />
      <Button size="sm" onClick={handleSaveDisplayName} disabled={isSaving} className="bg-green-600 hover:bg-green-500" aria-label={t('common.save')}>
        {isSaving ? <Loader size="sm" /> : <Check />}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setIsEditingName(false)} className="border-slate-600" aria-label={t('common.cancel')}>
        <X />
      </Button>
    </div>
  ) : isEditingCountry ? (
    <div className="flex flex-col gap-1 max-w-[260px]">
      <CountrySelector value={profile?.country_code} onChange={handleCountryChange} isDarkMode disabled={isSavingCountry} />
      <button type="button" onClick={() => setIsEditingCountry(false)} className="self-start text-xs text-neo-white/60 hover:text-neo-white">
        {t('common.cancel')}
      </button>
    </div>
  ) : undefined;

  const countryNode = (
    <button
      type="button"
      onClick={() => setIsEditingCountry(true)}
      className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-neo text-neo-white/70 hover:bg-neo-white/10"
      title={t('profile.changeCountry')}
      aria-label={t('profile.changeCountry')}
    >
      {profile?.country_code ? (
        <span className="text-2xl leading-none">{getCountryFlag(profile.country_code)}</span>
      ) : (
        <>
          <Globe className="w-4 h-4" aria-hidden />
          <span className="text-[11px] font-bold uppercase">{t('profile.addCountry')}</span>
        </>
      )}
    </button>
  );

  const avatarBadge = (
    <button
      type="button"
      onClick={openBuilder}
      className={cn(
        'absolute top-1 -inset-e-1 z-10 flex items-center justify-center',
        'rounded-full bg-neo-pink border-2 border-neo-black shadow-hard-sm',
        'text-white hover:scale-110 transition-transform',
        compact ? 'w-6 h-6' : 'w-9 h-9',
      )}
      title={t('profile.chooseAvatar')}
      aria-label={t('profile.chooseAvatar')}
    >
      <Edit size={compact ? 12 : 16} />
    </button>
  );

  return (
    <>
      <ShowcaseStage
        config={profile?.avatar_config}
        name={name}
        isPlaceholderName={isPlaceholder}
        countryNode={countryNode}
        nameEditor={nameEditor}
        level={level}
        levelPercent={xp.progressPercent}
        isMaxLevel={xp.isMaxLevel}
        xpToNext={xp.isMaxLevel ? null : Math.max(0, xp.nextLevelXp - xp.totalXp)}
        rankTier={scoreTier(profile?.total_score)}
        collection={collection}
        stats={stats}
        isOwn
        onEditAvatar={openBuilder}
        onEditName={startEditingName}
        onShare={profile?.username ? share : undefined}
        onSettings={onOpenSettings}
        avatarBadge={avatarBadge}
        frameId={equippedFrame}
        ringColorHex={playerStyle.accentHex}
        memberSince={memberSince}
        footer={avatarNudge.show ? (
          <AvatarCustomizeHint
            onCustomize={() => {
              avatarNudge.markClicked();
              openBuilder();
            }}
            onDismiss={avatarNudge.dismiss}
          />
        ) : null}
      />

      {collectionSlot && createPortal(
        <AvatarCollectionCard progress={collection} level={avatarPremium.level ?? level} onEditAvatar={openBuilder} />,
        collectionSlot,
      )}

      <AvatarBuilderModal
        isOpen={isAvatarBuilderOpen}
        onClose={() => setIsAvatarBuilderOpen(false)}
        onSave={handleAvatarSave}
        initialConfig={profile?.avatar_config ?? getRandomAvatarConfig()}
        premium={avatarPremium}
        previousConfig={previousAvatar}
      />
    </>
  );
}

export default ProfileHeader;
