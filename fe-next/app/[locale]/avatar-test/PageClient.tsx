'use client';

import { useState, useMemo } from 'react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import {
  type CustomAvatarConfig,
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

export default function AvatarTestPageClient() {
  const [savedConfig, setSavedConfig] = useState<CustomAvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Deterministic random avatars — same on SSR and client (no hydration mismatch)
  const randomAvatars = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => getSeededAvatarConfig(i * 7919 + 42)),
    []
  );

  return (
    <div className="min-h-screen bg-neo-navy p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-neo-display text-neo-white text-2xl sm:text-3xl font-bold">
            Avatar Builder Test
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-neo-lime text-neo-black font-bold text-sm sm:text-lg rounded-neo border-3 border-black shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              Open Avatar Builder
            </button>
            <div className="border-3 border-black shadow-hard-lg rounded-neo-lg overflow-hidden shrink-0">
              <AvatarRenderer config={savedConfig} size={80} />
            </div>
          </div>
        </div>

        {/* Random showcase grid */}
        <h2 className="font-neo-display text-neo-white text-lg font-bold mb-3">
          Random Avatars
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-12 gap-3 mb-10">
          {randomAvatars.map((config, i) => (
            <div key={`avatar-${i}`} className="border-3 border-black shadow-hard rounded-neo-lg overflow-hidden min-w-0 aspect-square">
              <AvatarRenderer config={config} size={64} className="block w-full h-full" disableEffects />
            </div>
          ))}
        </div>

        {/* Part showcase */}
        <h2 className="font-neo-display text-neo-white text-lg font-bold mb-4">
          All Parts
        </h2>

        {/* Bases */}
        <PartGrid title="Face Shapes">
          {AVATAR_BASES.map(base => (
            <PartCard key={base} label={base}>
              <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, base }} size={72} className="w-full h-auto" disableEffects />
            </PartCard>
          ))}
        </PartGrid>

        {/* Eyes */}
        <PartGrid title="Eye Styles">
          {AVATAR_EYE_STYLES.map(eyes => (
            <PartCard key={eyes} label={eyes}>
              <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, eyes }} size={72} className="w-full h-auto" disableEffects />
            </PartCard>
          ))}
        </PartGrid>

        {/* Mouths */}
        <PartGrid title="Mouth Styles">
          {AVATAR_MOUTH_STYLES.map(mouth => (
            <PartCard key={mouth} label={mouth}>
              <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, mouth }} size={72} className="w-full h-auto" disableEffects />
            </PartCard>
          ))}
        </PartGrid>

        {/* Hair */}
        <PartGrid title="Hair Styles">
          {AVATAR_HAIR_STYLES.map(hair => (
            <PartCard key={hair} label={hair}>
              <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, hair, hairColor: '#C62828' }} size={72} className="w-full h-auto" disableEffects />
            </PartCard>
          ))}
        </PartGrid>

        {/* Accessories */}
        <PartGrid title="Accessories">
          {AVATAR_ACCESSORIES.map(accessory => (
            <PartCard key={accessory} label={accessory}>
              <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, accessory, accessoryColor: '#FFD700' }} size={72} className="w-full h-auto" disableEffects />
            </PartCard>
          ))}
        </PartGrid>
      </div>

      {/* Builder Modal */}
      <AvatarBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={setSavedConfig}
        initialConfig={savedConfig}
        premium={null}
      />
    </div>
  );
}
