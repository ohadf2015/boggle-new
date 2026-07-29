'use client';

/**
 * VFXTileEffect — WebGL shader overlay for grid tiles at high combo levels.
 * Mounts a tiny wrapper div that @vfx-js/core attaches its canvas to.
 * Only renders when combo >= 3 to avoid unnecessary GPU work.
 */

import { memo, useEffect } from 'react';
import { useVFXShader, getComboShader } from '@/hooks/useVFXShader';

interface VFXTileEffectProps {
  comboLevel: number;
  isSelected: boolean;
  reduceMotion: boolean;
}

const VFXTileEffect = memo<VFXTileEffectProps>(({ comboLevel, isSelected, reduceMotion }) => {
  const { ref, applyEffect, removeEffect } = useVFXShader();
  const shader = isSelected ? getComboShader(comboLevel) : null;

  useEffect(() => {
    if (reduceMotion || !shader) {
      removeEffect();
      return;
    }
    applyEffect(shader);
  }, [shader, reduceMotion, applyEffect, removeEffect]);

  // Only mount the wrapper when we could potentially have an effect
  if (comboLevel < 3 || !isSelected || reduceMotion) return null;

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-[5] pointer-events-none rounded-[6px] overflow-hidden"
      aria-hidden="true"
    />
  );
});

VFXTileEffect.displayName = 'VFXTileEffect';

export default VFXTileEffect;
