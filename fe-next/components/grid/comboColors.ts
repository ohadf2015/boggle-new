/**
 * Combo Colors
 * NEO-BRUTALIST FLAT COLORS with hard shadows for combo levels
 */

import type { ComboColors } from './types';

/**
 * Get combo colors based on level
 * Returns NEO-BRUTALIST flat colors with hard shadows
 */
export function getComboColors(level: number): ComboColors {
  // Show combo bonus as +N (capped at +5 for scoring, but visual can go higher)
  const bonus = Math.min(level, 5); // Actual bonus caps at 5
  const bonusText = `+${bonus}`;

  if (level === 0) {
    // No combo - Electric Yellow (Neo-Brutalist primary)
    return {
      bg: 'bg-neo-yellow',
      border: 'border-neo-black',
      shadow: 'shadow-hard',
      text: null, // Don't show +0
      flicker: false
    };
  } else if (level === 1) {
    // +1 - Orange
    return {
      bg: 'bg-neo-orange',
      border: 'border-neo-black',
      shadow: 'shadow-hard-lg',
      text: bonusText,
      flicker: false
    };
  } else if (level === 2) {
    // +2 - Red
    return {
      bg: 'bg-neo-red',
      border: 'border-neo-black',
      shadow: 'shadow-hard-lg',
      text: bonusText,
      flicker: false,
      textColor: 'text-neo-white'
    };
  } else if (level === 3) {
    // +3 - Pink
    return {
      bg: 'bg-neo-pink',
      border: 'border-neo-black',
      shadow: 'shadow-hard-lg',
      text: bonusText,
      flicker: false,
      textColor: 'text-neo-white'
    };
  } else if (level === 4) {
    // +4 - Purple
    return {
      bg: 'bg-neo-purple',
      border: 'border-neo-black',
      shadow: 'shadow-hard-xl',
      text: bonusText,
      flicker: false,
      textColor: 'text-neo-white'
    };
  } else if (level === 5) {
    // +5 (max bonus) - Cyan
    return {
      bg: 'bg-neo-cyan',
      border: 'border-neo-black',
      shadow: 'shadow-hard-xl',
      text: bonusText,
      flicker: false
    };
  } else if (level === 6) {
    // +5 (visual level 6) - Lime
    return {
      bg: 'bg-neo-lime',
      border: 'border-neo-black',
      shadow: 'shadow-hard-xl',
      text: bonusText,
      flicker: false
    };
  } else if (level === 7) {
    // +5 (visual level 7) - Rainbow with hard shadow
    return {
      bg: 'rainbow-gradient',
      border: 'border-neo-black border-4',
      shadow: 'shadow-hard-xl',
      text: bonusText,
      flicker: false,
      isRainbow: true,
      textColor: 'text-neo-white'
    };
  } else if (level === 8) {
    // +5 (visual level 8) - Rainbow with strobe
    return {
      bg: 'rainbow-gradient',
      border: 'border-neo-black border-4',
      shadow: 'shadow-hard-2xl',
      text: bonusText,
      flicker: true,
      isRainbow: true,
      strobe: true,
      textColor: 'text-neo-white'
    };
  } else {
    // Level 9+ : Full rainbow with intense strobe (bonus still +5)
    return {
      bg: 'rainbow-gradient',
      border: 'border-neo-black border-5',
      shadow: 'shadow-hard-2xl',
      text: bonusText,
      flicker: true,
      isRainbow: true,
      strobe: true,
      intenseStrobe: true,
      textColor: 'text-neo-white'
    };
  }
}
