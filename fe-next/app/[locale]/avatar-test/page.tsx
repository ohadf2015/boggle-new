'use client';

import { useState } from 'react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import {
  type CustomAvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  getRandomAvatarConfig,
  AVATAR_BASES,
  AVATAR_EYE_STYLES,
  AVATAR_MOUTH_STYLES,
  AVATAR_HAIR_STYLES,
  AVATAR_ACCESSORIES,
} from '@/shared/types/customAvatar';

export default function AvatarTestPage() {
  const [savedConfig, setSavedConfig] = useState<CustomAvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Generate a grid of random avatars for showcase
  const randomAvatars = Array.from({ length: 12 }, () => getRandomAvatarConfig());

  return (
    <div className="min-h-screen bg-neo-navy p-8">
      <h1 className="font-neo-display text-neo-white text-3xl font-bold mb-8">
        Avatar Builder Test
      </h1>

      {/* Builder button + saved avatar */}
      <div className="flex items-center gap-6 mb-10">
        <div className="border-3 border-black shadow-hard-lg rounded-neo-lg overflow-hidden">
          <AvatarRenderer config={savedConfig} size={120} />
        </div>
        <button
          onClick={() => setIsBuilderOpen(true)}
          className="px-6 py-3 bg-neo-lime text-neo-black font-bold text-lg rounded-neo border-3 border-black shadow-hard hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all"
        >
          Open Avatar Builder
        </button>
      </div>

      {/* Random showcase grid */}
      <h2 className="font-neo-display text-neo-white text-xl font-bold mb-4">
        Random Avatars
      </h2>
      <div className="grid grid-cols-6 gap-4 mb-10">
        {randomAvatars.map((config, i) => (
          <div key={i} className="border-3 border-black shadow-hard rounded-neo-lg overflow-hidden">
            <AvatarRenderer config={config} size={100} />
          </div>
        ))}
      </div>

      {/* Part showcase */}
      <h2 className="font-neo-display text-neo-white text-xl font-bold mb-4">
        All Parts
      </h2>

      {/* Bases */}
      <h3 className="text-neo-cyan font-bold mb-2">Face Shapes</h3>
      <div className="flex gap-3 mb-6">
        {AVATAR_BASES.map(base => (
          <div key={base} className="text-center">
            <div className="border-2 border-black rounded-neo overflow-hidden">
              <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, base }} size={72} />
            </div>
            <p className="text-neo-white/60 text-xs mt-1">{base}</p>
          </div>
        ))}
      </div>

      {/* Eyes */}
      <h3 className="text-neo-cyan font-bold mb-2">Eye Styles</h3>
      <div className="flex gap-3 mb-6 flex-wrap">
        {AVATAR_EYE_STYLES.map(eyes => (
          <div key={eyes} className="text-center">
            <div className="border-2 border-black rounded-neo overflow-hidden">
              <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, eyes }} size={72} />
            </div>
            <p className="text-neo-white/60 text-xs mt-1">{eyes}</p>
          </div>
        ))}
      </div>

      {/* Mouths */}
      <h3 className="text-neo-cyan font-bold mb-2">Mouth Styles</h3>
      <div className="flex gap-3 mb-6 flex-wrap">
        {AVATAR_MOUTH_STYLES.map(mouth => (
          <div key={mouth} className="text-center">
            <div className="border-2 border-black rounded-neo overflow-hidden">
              <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, mouth }} size={72} />
            </div>
            <p className="text-neo-white/60 text-xs mt-1">{mouth}</p>
          </div>
        ))}
      </div>

      {/* Hair */}
      <h3 className="text-neo-cyan font-bold mb-2">Hair Styles</h3>
      <div className="flex gap-3 mb-6 flex-wrap">
        {AVATAR_HAIR_STYLES.map(hair => (
          <div key={hair} className="text-center">
            <div className="border-2 border-black rounded-neo overflow-hidden">
              <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, hair, hairColor: '#C62828' }} size={72} />
            </div>
            <p className="text-neo-white/60 text-xs mt-1">{hair}</p>
          </div>
        ))}
      </div>

      {/* Accessories */}
      <h3 className="text-neo-cyan font-bold mb-2">Accessories</h3>
      <div className="flex gap-3 mb-6 flex-wrap">
        {AVATAR_ACCESSORIES.map(accessory => (
          <div key={accessory} className="text-center">
            <div className="border-2 border-black rounded-neo overflow-hidden">
              <AvatarRenderer config={{ ...DEFAULT_AVATAR_CONFIG, accessory, accessoryColor: '#FFD700' }} size={72} />
            </div>
            <p className="text-neo-white/60 text-xs mt-1">{accessory}</p>
          </div>
        ))}
      </div>

      {/* Builder Modal */}
      <AvatarBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSave={setSavedConfig}
        initialConfig={savedConfig}
      />
    </div>
  );
}
