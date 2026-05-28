'use client';

import { useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import { useAuth } from '@/contexts/AuthContext';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

const SAMPLE_AVATARS: CustomAvatarConfig[] = [
  { gender: 'male', base: 'round', skinColor: '#FFDBB4', hair: 'spiky', hairColor: '#2C1B18', eyes: 'star', mouth: 'grin', accessory: 'sunglasses', accessoryColor: '#000000', bgColor: '#FF6B35' },
  { gender: 'male', base: 'square', skinColor: '#D08B5B', hair: 'afro', hairColor: '#2C1B18', eyes: 'happy', mouth: 'smile', accessory: 'crown', accessoryColor: '#FFD700', bgColor: '#8B5CF6' },
  { gender: 'female', base: 'heart', skinColor: '#EDB98A', hair: 'ponytail', hairColor: '#FF1493', eyes: 'sparkle', mouth: 'cat', accessory: 'headband', accessoryColor: '#00FFFF', bgColor: '#00897B' },
];

const WOBBLES = [
  { rotate: [0, -5, 5, -3, 0], y: [0, -2, 0] },
  { rotate: [0, 4, -4, 2, 0], y: [0, -3, 0] },
  { rotate: [0, -3, 6, -2, 0], y: [0, -2, 0] },
];

interface LandingAvatarTeaserProps {
  onBuilderOpenChange?: (isOpen: boolean) => void;
}

export function LandingAvatarTeaser({ onBuilderOpenChange }: LandingAvatarTeaserProps) {
  const { t, dir } = useLanguage();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const avatarPremium = useAvatarPremium();
  const { profile, updateProfile } = useAuth();

  const openBuilder = () => {
    setIsBuilderOpen(true);
    onBuilderOpenChange?.(true);
  };
  const closeBuilder = () => {
    setIsBuilderOpen(false);
    onBuilderOpenChange?.(false);
  };
  const handleSave = async (config: CustomAvatarConfig) => {
    try {
      await updateProfile({ avatar_config: config });
    } finally {
      closeBuilder();
    }
  };

  return (
    <>
    <AdaptiveMotion.button
      type="button"
      onClick={openBuilder}
      className={cn(
        'flex items-center gap-4 sm:gap-5 px-5 py-4 sm:px-6 sm:py-5',
        'bg-linear-to-r from-neo-purple/25 to-neo-pink/15',
        'border-3 border-neo-black rounded-neo-lg shadow-hard',
        'max-w-lg mx-auto lg:max-w-none lg:h-full cursor-pointer',
        'hover:shadow-hard-lg hover:-translate-y-0.5 active:shadow-hard-pressed active:translate-y-[2px]',
        'transition-all duration-150',
        'group'
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
    >
      <div className="flex -space-x-3 rtl:space-x-reverse shrink-0">
        {SAMPLE_AVATARS.map((config, i) => (
          <AdaptiveMotion.div
            key={`${config.bgColor}-${config.hair}`}
            className={cn(
              'border-3 border-neo-black rounded-full overflow-hidden shadow-hard-sm',
              'group-hover:border-neo-purple transition-colors',
            )}
            animate={WOBBLES[i]}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, repeatDelay: 3 + i, ease: 'easeInOut' }}
          >
            <AvatarRenderer config={config} size={48} />
          </AdaptiveMotion.div>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-neo-white text-sm sm:text-base uppercase">
          {t('landing.createAvatar')}
        </p>
        <p className="text-neo-white text-xs sm:text-sm font-medium flex items-center gap-1.5 mt-0.5">
          {t('landing.designYourLook')}
          <AdaptiveMotion.span
            animate={{ x: dir === 'rtl' ? [0, -5, 0] : [0, 5, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowIcon className="w-3.5 h-3.5 text-neo-purple" />
          </AdaptiveMotion.span>
        </p>
      </div>
    </AdaptiveMotion.button>
    <AvatarBuilderModal
      isOpen={isBuilderOpen}
      onClose={closeBuilder}
      onSave={handleSave}
      initialConfig={profile?.avatar_config ?? undefined}
      premium={avatarPremium}
    />
    </>
  );
}
