'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Edit, Check, Globe, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { Input } from '@/components/ui/input';
import Avatar from '@/components/Avatar';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import { CountrySelector } from '@/components/settings/CountrySelector';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import LevelBadge from '@/components/LevelBadge';
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
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative bg-neo-navy/60 border-3 border-neo-cream/20 rounded-neo-lg shadow-hard-lg mb-4',
        compact ? 'p-4' : 'p-8'
      )}
    >
      {/* Sparkle decorations */}
      <Sparkles className="absolute top-4 inset-e-16 w-5 h-5 text-white/20 animate-pulse" aria-hidden="true" />
      <Sparkles className="absolute bottom-6 inset-s-4 w-4 h-4 text-white/15 animate-pulse" aria-hidden="true" />

      {/* Level badge — top-right */}
      {!compact && (
        <div className="absolute top-4 inset-e-4 bg-neo-yellow rounded-xl border-3 border-neo-black shadow-hard px-3 py-1.5 -rotate-6">
          <span className="text-2xl font-black text-neo-black leading-none">{level}</span>
          <span className="block text-[9px] font-bold uppercase tracking-wider text-neo-black/70">{t('xp.level')}</span>
        </div>
      )}

      <div className={cn('flex', compact ? 'flex-row gap-3 items-center' : 'flex-row gap-6 items-center')}>
        {/* Avatar with overlay control buttons */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'relative rounded-full border-3 border-neo-yellow shadow-hard-yellow overflow-hidden',
              compact ? 'w-20 h-20' : 'w-28 h-28'
            )}
          >
            <Avatar
              customAvatar={profile?.avatar_config ?? undefined}
              userId={profile?.id}
              size={compact ? 'lg' : '2xl'}
              className="w-full h-full"
            />
          </div>

          {/* Edit avatar button */}
          <button
            onClick={() => setIsAvatarBuilderOpen(true)}
            className={cn(
              'absolute -bottom-1 -inset-e-1 flex items-center justify-center',
              'rounded-full bg-neo-pink border-3 border-neo-black shadow-hard-sm',
              'text-white hover:bg-neo-pink/80 hover:scale-110 transition-all',
              compact ? 'w-6 h-6' : 'w-9 h-9'
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
                className="h-10 text-lg font-bold bg-slate-700 border-slate-600"
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
                className="p-1 rounded hover:bg-slate-700 transition-colors shrink-0 text-gray-400"
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
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/60 text-sm text-gray-300 hover:bg-slate-600/60 transition-colors"
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

            <span className="px-3 py-1 rounded-full bg-slate-700/60 text-sm text-gray-400">
              {t('profile.memberSince')} {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
            </span>
          </div>

        </div>
      </div>

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
      />
    </motion.div>
  );
}

export default ProfileHeader;
