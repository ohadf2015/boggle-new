'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

const SAMPLE_AVATARS: CustomAvatarConfig[] = [
  { base: 'round', skinColor: '#FFDBB4', hair: 'spiky', hairColor: '#2C1B18', eyes: 'star', mouth: 'grin', accessory: 'sunglasses', accessoryColor: '#000000', bgColor: '#FF6B35' },
  { base: 'square', skinColor: '#D08B5B', hair: 'afro', hairColor: '#2C1B18', eyes: 'happy', mouth: 'smile', accessory: 'crown', accessoryColor: '#FFD700', bgColor: '#8B5CF6' },
  { base: 'heart', skinColor: '#EDB98A', hair: 'ponytail', hairColor: '#FF1493', eyes: 'sparkle', mouth: 'cat', accessory: 'headband', accessoryColor: '#00FFFF', bgColor: '#00897B' },
];

const WOBBLES = [
  { rotate: [0, -5, 5, -3, 0], y: [0, -2, 0] },
  { rotate: [0, 4, -4, 2, 0], y: [0, -3, 0] },
  { rotate: [0, -3, 6, -2, 0], y: [0, -2, 0] },
];

export function LandingAvatarTeaser() {
  const { t, dir } = useLanguage();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  return (
    <>
    <motion.div
      onClick={() => setIsBuilderOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsBuilderOpen(true); } }}
      className={cn(
        'flex items-center gap-4 px-4 py-3',
        'bg-neo-purple/20 border-2 border-neo-purple/40 rounded-neo-lg',
        'max-w-md mx-auto cursor-pointer',
        'hover:bg-neo-purple/30 transition-colors'
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
    >
      <div className="flex -space-x-2 rtl:space-x-reverse shrink-0">
        {SAMPLE_AVATARS.map((config, i) => (
          <motion.div
            key={i}
            className="border-2 border-neo-black rounded-full overflow-hidden"
            animate={WOBBLES[i]}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, repeatDelay: 3 + i, ease: 'easeInOut' }}
          >
            <AvatarRenderer config={config} size={40} />
          </motion.div>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-neo-white text-sm">
          {t('landing.createAvatar')}
        </p>
        <p className="text-neo-white/60 text-xs flex items-center gap-1">
          {t('landing.designYourLook')}
          <motion.span
            animate={{ x: dir === 'rtl' ? [0, -4, 0] : [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowIcon className="w-3 h-3" />
          </motion.span>
        </p>
      </div>
    </motion.div>
    <AvatarBuilderModal
      isOpen={isBuilderOpen}
      onClose={() => setIsBuilderOpen(false)}
      onSave={() => setIsBuilderOpen(false)}
    />
    </>
  );
}
