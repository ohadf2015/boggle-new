'use client';

import React, { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { X, Edit, Check, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { Input } from '@/components/ui/input';
import Avatar from '@/components/Avatar';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import { AvatarCustomizeHint } from '@/components/profile/AvatarCustomizeHint';
import { useAvatarCustomizationNudge } from '@/hooks/useAvatarCustomizationNudge';
import { useAvatarHistory } from '@/hooks/useAvatarHistory';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import { useEquippedCosmetic } from '@/hooks/useEquippedCosmetic';
import { CountrySelector } from '@/components/settings/CountrySelector';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlayerStyle } from '@/contexts/PlayerStyleContext';
import LevelBadge from '@/components/LevelBadge';
import { RankTierChip } from '@/components/seasons/RankTierChip';
import { scoreTier } from '@/lib/seasons/scoreTier';
import { getLevelFromXp } from '@/components/XpProgressBar';
import { cn } from '@/lib/utils';
import type { ProfileData } from '@/contexts/auth/authTypes';
import { getRandomAvatarConfig, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getCreatorStats } from '@/utils/creatorRewards';
import CreatorProfileStats from '@/components/ugc/CreatorProfileStats';

interface ProfileHeaderProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  compact?: boolean;
  /** @deprecated No longer used — profile picture upload removed */
  isUploading?: boolean;
  /** @deprecated No longer used — profile picture upload removed */
  onProfilePictureUpload?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** @deprecated No longer used — profile picture upload removed */
  onRemoveProfilePicture?: () => Promise<void>;
  updateProfile: (updates: Partial<ProfileData>) => Promise<{ data: ProfileData | null; error: { message: string } | null }>;
  refreshProfile: () => Promise<void>;
}

export function ProfileHeader({
  profile,
  isDarkMode,
  compact = false,
  updateProfile,
  refreshProfile
}: ProfileHeaderProps): React.ReactNode {
  const { t } = useLanguage();
  const creatorStats = getCreatorStats();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingCountry, setIsEditingCountry] = useState(false);
  const [isSavingCountry, setIsSavingCountry] = useState(false);
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const avatarPremium = useAvatarPremium();
  const equippedFrame = useEquippedCosmetic('profileFrame');
  // Personal accent ring: only when the player picked a non-default style
  // (accentHex non-null). Default users keep the neutral cyan ring → no change.
  const { style: playerStyle } = usePlayerStyle();
  const avatarNudge = useAvatarCustomizationNudge();
  // Persistent "previous avatar" so a save can always be reverted (even later).
  const { previousConfig: previousAvatar, stashCurrent: stashPreviousAvatar } =
    useAvatarHistory(profile?.id);

  const startEditingName = (): void => {
    setEditDisplayName(profile?.display_name || profile?.username || '');
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
      // Stash the outgoing avatar as "previous" before overwriting it, so the
      // player can always restore the avatar they had before this save.
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

  const level = getLevelFromXp(profile?.total_xp || 0);

  return (
    <m.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative bg-neo-navy-light border border-white/[0.08] rounded-neo-xl mb-4',
        compact ? 'p-4' : 'p-6'
      )}
    >
      {/* Level badge + season tier — top-right */}
      {!compact && (
        <div className="absolute top-4 inset-e-4 flex flex-col items-end gap-1.5">
          <div className="bg-neo-cyan/10 rounded-xl px-3 py-1.5 text-center">
            <span className="text-xl font-black text-neo-cyan leading-none">{level}</span>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">{t('xp.level')}</span>
          </div>
          {scoreTier(profile?.total_score) !== 'stone' && (
            <RankTierChip tier={scoreTier(profile?.total_score)} size="xs" />
          )}
        </div>
      )}

      <div className={cn('flex', compact ? 'flex-row gap-3 items-center' : 'flex-row gap-5 items-center')}>
        {/* Avatar with subtle cyan ring */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'relative rounded-full overflow-hidden',
              !equippedFrame || equippedFrame === 'frame-none'
                ? playerStyle.accentHex
                  ? 'ring-4 ring-accent ring-offset-2 ring-offset-slate-800/40'
                  : 'ring-2 ring-neo-cyan/30 ring-offset-2 ring-offset-slate-800/40'
                : '',
              compact ? 'w-20 h-20' : 'w-24 h-24'
            )}
          >
            <Avatar
              customAvatar={profile?.avatar_config ?? undefined}
              userId={profile?.id}
              size={compact ? 'lg' : '2xl'}
              className="w-full h-full"
              frame={equippedFrame}
            />
          </div>

          {/* Edit avatar button */}
          <button
            onClick={() => setIsAvatarBuilderOpen(true)}
            className={cn(
              'absolute -bottom-1 -inset-e-1 flex items-center justify-center',
              'rounded-full bg-neo-pink/90 border border-white/20',
              'text-white hover:bg-neo-pink hover:scale-110 transition-all',
              compact ? 'w-6 h-6' : 'w-8 h-8'
            )}
            title={t('profile.chooseAvatar')}
            aria-label={t('profile.chooseAvatar')}
          >
            <Edit size={compact ? 12 : 14} />
          </button>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                className="h-10 text-lg font-bold bg-neo-navy-elevated border-slate-600"
                maxLength={20}
                
              />
              <Button
                size="sm"
                onClick={handleSaveDisplayName}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-500"
              >
                {isSaving ? <Loader size="sm" /> : <Check />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingName(false)}
                className="border-slate-600"
              >
                <X />
              </Button>
            </div>
          ) : (
            <h1 className={cn(
              'font-black font-neo-display uppercase tracking-tight text-white flex items-center gap-2 truncate',
              compact ? 'text-xl' : 'text-4xl md:text-5xl'
            )}>
              <span className="truncate">{profile?.display_name || profile?.username || 'Player'}</span>
              <button
                onClick={startEditingName}
                className="p-1 rounded hover:bg-neo-navy-elevated transition-colors shrink-0 text-gray-400"
                title={t('profile.editName')}
                aria-label={t('profile.editName')}
              >
                <Edit size={compact ? 12 : 16} />
              </button>
            </h1>
          )}

          {/* Compact level badge inline */}
          {compact && (
            <div className="inline-flex items-center mt-1">
              <LevelBadge level={level} size="sm" showLabel />
            </div>
          )}

          {/* Country + join date pills */}
          <div className={cn('flex flex-wrap items-center gap-2', compact ? 'mt-1' : 'mt-3')}>
            {isEditingCountry ? (
              <div className="max-w-[200px]">
                <CountrySelector
                  value={profile?.country_code}
                  onChange={handleCountryChange}
                  isDarkMode={isDarkMode}
                  disabled={isSavingCountry}
                />
                <button
                  onClick={() => setIsEditingCountry(false)}
                  className="mt-1 text-xs text-gray-500 hover:text-gray-400"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingCountry(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neo-navy-elevated/60 text-sm text-gray-300 hover:bg-slate-600/60 transition-colors"
                title={t('profile.changeCountry')}
              >
                {profile?.country_code ? (
                  <>
                    <span className="text-base">{getCountryFlag(profile.country_code)}</span>
                    <span>{profile.country_code}</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>{t('profile.addCountry')}</span>
                  </>
                )}
                <Edit className="w-3 h-3 opacity-60" />
              </button>
            )}

            <span className="px-3 py-1 rounded-full bg-neo-navy-elevated/60 text-sm text-gray-400">
              {t('profile.memberSince')} {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
            </span>
          </div>

        </div>
      </div>

      {/* Gentle nudge: invite users still wearing their random starter avatar
          to make it their own. Authed-only, dismissible, snoozes 30 days. */}
      {!compact && avatarNudge.show && (
        <AvatarCustomizeHint
          onCustomize={() => {
            avatarNudge.markClicked();
            setIsAvatarBuilderOpen(true);
          }}
          onDismiss={avatarNudge.dismiss}
        />
      )}

      {/* Creator Stats */}
      {creatorStats.boardsCreated > 0 && (
        <CreatorProfileStats stats={creatorStats} className="mt-4" />
      )}

      {/* Avatar Builder Modal */}
      <AvatarBuilderModal
        isOpen={isAvatarBuilderOpen}
        onClose={() => setIsAvatarBuilderOpen(false)}
        onSave={handleAvatarSave}
        initialConfig={profile?.avatar_config ?? getRandomAvatarConfig()}
        premium={avatarPremium}
        previousConfig={previousAvatar}
      />
    </m.div>
  );
}

export default ProfileHeader;
