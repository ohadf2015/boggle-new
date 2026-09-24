'use client';

import { useMemo } from 'react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import ArtShowcase from '@/components/avatar/art/ArtShowcase';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DEFAULT_AVATAR_CONFIG,
  getSeededAvatarConfig,
  AVATAR_BASES,
  AVATAR_EYE_STYLES,
  AVATAR_MOUTH_STYLES,
  AVATAR_HAIR_STYLES,
  AVATAR_ACCESSORIES,
} from '@/shared/types/customAvatar';

/** Part grid section with consistent layout */
function PartGrid({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-neo-cyan font-bold mb-3 text-sm uppercase tracking-wider">{title}</h3>
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
        {children}
      </div>
    </div>
  );
}

/** Part ids are shown raw on purpose — this is a QA gallery keyed by id. */
function PartCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="border-2 border-neo-white/10 rounded-neo overflow-hidden bg-neo-navy/50 hover:border-neo-cyan/40 transition-colors">
        {children}
      </div>
      <p className="text-neo-white text-[10px] mt-1 truncate">{label}</p>
    </div>
  );
}

/** The original all-parts gallery (view=grid, the default). */
export default function LabGrid() {
  const { t } = useLanguage();
  // Deterministic random avatars — same on SSR and client (no hydration mismatch)
  const randomAvatars = useMemo(
    () => Array.from({ length: 12 }, (_, i) => getSeededAvatarConfig(i * 7919 + 42)),
    [],
  );

  return (
    <div data-testid="avatar-lab-view-grid">
      <ArtShowcase />
      <h2 className="font-neo-display text-neo-white text-lg font-bold mb-3">{t('avatarLab.randomAvatars')}</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-12 gap-3 mb-10">
        {randomAvatars.map((config, i) => (
          <div key={`avatar-${i}`} className="border-3 border-black shadow-hard rounded-neo-lg overflow-hidden min-w-0 aspect-square">
            <AvatarRenderer config={config} size={64} className="block w-full h-full" disableEffects />
          </div>
        ))}
      </div>

      <h2 className="font-neo-display text-neo-white text-lg font-bold mb-4">{t('avatarLab.allParts')}</h2>

      <PartGrid title={t('avatarLab.sections.faceShapes')}>
        {AVATAR_BASES.map(base => (
          <PartCard key={base} label={base}>
            <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, base }} size={72} className="w-full h-auto" disableEffects />
          </PartCard>
        ))}
      </PartGrid>

      <PartGrid title={t('avatarLab.sections.eyes')}>
        {AVATAR_EYE_STYLES.map(eyes => (
          <PartCard key={eyes} label={eyes}>
            <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, eyes }} size={72} className="w-full h-auto" disableEffects />
          </PartCard>
        ))}
      </PartGrid>

      <PartGrid title={t('avatarLab.sections.mouths')}>
        {AVATAR_MOUTH_STYLES.map(mouth => (
          <PartCard key={mouth} label={mouth}>
            <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, mouth }} size={72} className="w-full h-auto" disableEffects />
          </PartCard>
        ))}
      </PartGrid>

      <PartGrid title={t('avatarLab.sections.hair')}>
        {AVATAR_HAIR_STYLES.map(hair => (
          <PartCard key={hair} label={hair}>
            <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, hair, hairColor: '#C62828' }} size={72} className="w-full h-auto" disableEffects />
          </PartCard>
        ))}
      </PartGrid>

      <PartGrid title={t('avatarLab.sections.accessories')}>
        {AVATAR_ACCESSORIES.map(accessory => (
          <PartCard key={accessory} label={accessory}>
            <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, accessory, accessoryColor: '#FFD700' }} size={72} className="w-full h-auto" disableEffects />
          </PartCard>
        ))}
      </PartGrid>
    </div>
  );
}
