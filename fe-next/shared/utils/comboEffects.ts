/**
 * Combo Effect Tiers
 * Maps combo levels to visual/audio effect intensities
 */

export interface ComboEffectTier {
  name: 'none' | 'glow' | 'particles' | 'shake' | 'fire';
  glowColor: string;
  particleCount: number;
  shakeIntensity: number;
  soundKey: string;
}

const TIERS: Record<ComboEffectTier['name'], Omit<ComboEffectTier, 'name'>> = {
  none: {
    glowColor: 'transparent',
    particleCount: 0,
    shakeIntensity: 0,
    soundKey: '',
  },
  glow: {
    glowColor: '#00FFFF',
    particleCount: 0,
    shakeIntensity: 0,
    soundKey: 'combo_glow',
  },
  particles: {
    glowColor: '#FF00FF',
    particleCount: 6,
    shakeIntensity: 0,
    soundKey: 'combo_particles',
  },
  shake: {
    glowColor: '#FFD700',
    particleCount: 8,
    shakeIntensity: 3,
    soundKey: 'combo_shake',
  },
  fire: {
    glowColor: '#FF4500',
    particleCount: 12,
    shakeIntensity: 5,
    soundKey: 'combo_fire',
  },
};

export function getComboEffectTier(comboLevel: number): ComboEffectTier {
  let name: ComboEffectTier['name'];

  if (comboLevel >= 10) {
    name = 'fire';
  } else if (comboLevel >= 7) {
    name = 'shake';
  } else if (comboLevel >= 5) {
    name = 'particles';
  } else if (comboLevel >= 3) {
    name = 'glow';
  } else {
    name = 'none';
  }

  return { name, ...TIERS[name] };
}
