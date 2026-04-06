import type { BlastTileType } from './types';

/**
 * AAA Royal Blast tile visuals — 3D candy-button treatment.
 * Each tile gets a top-to-bottom gradient for depth, specular inset highlight,
 * thick bottom shadow for physical height, and type-specific glow.
 * Colors use the LexiClash neo palette: lime, cyan, pink, purple, cream.
 */
export const TILE_VISUALS: Record<BlastTileType, { bg: string; indicator?: string; text?: string; style?: React.CSSProperties }> = {
  standard: {
    bg: '', text: 'text-neo-cream',
    style: {
      background: 'linear-gradient(180deg, rgba(30,28,50,0.75) 0%, rgba(20,18,40,0.7) 40%, rgba(15,13,30,0.65) 100%)',
      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.08), inset 0 -2px 3px rgba(0,0,0,0.3), 0 4px 0 rgba(0,0,0,0.4), 0 6px 8px rgba(0,0,0,0.25)',
      border: '2px solid rgba(255,254,240,0.12)',
    },
  },
  gold: {
    bg: '', indicator: '✦', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(180deg, #FFE566 0%, #FFD700 35%, #B8860B 100%)',
      boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.15), 0 4px 0 #8B6914, 0 6px 12px rgba(255,215,0,0.3), 0 0 16px rgba(255,215,0,0.2)',
    },
  },
  bomb: {
    bg: '', indicator: '💣', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #FF6B6B 0%, #FF3366 40%, #CC0033 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,180,180,0.5), inset 0 -2px 4px rgba(0,0,0,0.25), 0 4px 0 #990022, 0 6px 10px rgba(255,51,102,0.3)',
    },
  },
  lightning: {
    bg: '', indicator: '⚡', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(180deg, #66FFFF 0%, #00FFFF 40%, #00B3B3 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.15), 0 4px 0 #008888, 0 6px 10px rgba(0,255,255,0.25), 0 0 12px rgba(0,255,255,0.15)',
    },
  },
  prism: {
    bg: '', indicator: '🔷', text: 'text-white',
    style: {
      background: 'conic-gradient(from 0deg, #FF1493, #8B5CF6, #00FFFF, #BFFF00, #FF1493)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 0 #5B21B6, 0 6px 10px rgba(139,92,246,0.3)',
    },
  },
  rainbow: {
    bg: '', indicator: '🌈', text: 'text-white',
    style: {
      background: 'linear-gradient(135deg, #FF1493 0%, #8B5CF6 50%, #00FFFF 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 0 #6B21A8, 0 6px 10px rgba(139,92,246,0.25)',
    },
  },
  ice: {
    bg: '', indicator: '❄', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(180deg, #E0FFFF 0%, #99EEFF 40%, #66DDEE 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.7), inset 0 -2px 3px rgba(0,0,0,0.08), 0 4px 0 #44AABB, 0 6px 10px rgba(0,200,220,0.2)',
    },
  },
  gem: {
    bg: '', indicator: '💎', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #7DFFB3 0%, #34D399 40%, #059669 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 0 #047857, 0 6px 10px rgba(52,211,153,0.25)',
    },
  },
  frozen: {
    bg: '', indicator: '🧊', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(180deg, #E8F4FF 0%, #B8DDFF 40%, #88BBEE 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.7), inset 0 -2px 3px rgba(0,0,0,0.08), 0 4px 0 #6699BB, 0 6px 8px rgba(136,187,238,0.2)',
    },
  },
  magnet: {
    bg: '', indicator: '🌀', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #A78BFA 0%, #8B5CF6 40%, #6D28D9 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 0 #4C1D95, 0 6px 10px rgba(139,92,246,0.25)',
    },
  },
  mirror: {
    bg: '', indicator: '🪞', text: 'text-neo-cream',
    style: {
      background: 'linear-gradient(180deg, rgba(200,200,220,0.6) 0%, rgba(160,155,175,0.55) 40%, rgba(130,125,145,0.5) 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.4), inset 0 -2px 3px rgba(0,0,0,0.15), 0 4px 0 rgba(80,75,90,0.6), 0 6px 8px rgba(200,190,220,0.2), 0 0 12px rgba(200,200,255,0.15)',
    },
  },
  silver: {
    bg: '', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #E0E0E8 0%, #B0B0C0 40%, #8888A0 100%)',
      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.1), 0 4px 0 #606878, 0 6px 8px rgba(128,128,160,0.25)',
    },
  },
  diamond: {
    bg: '', indicator: '💠', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #88FFFF 0%, #00EEFF 40%, #00BBCC 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.15), 0 4px 0 #008899, 0 6px 12px rgba(0,238,255,0.3), 0 0 14px rgba(0,255,255,0.2)',
    },
  },
  wildcard: {
    bg: '', indicator: '🃏', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(135deg, #FFE4FF 0%, #E8B4F8 40%, #C084FC 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.1), 0 4px 0 #9333EA, 0 6px 10px rgba(192,132,252,0.3)',
    },
  },
  countdown: {
    bg: '', indicator: '⏳', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #FF9966 0%, #FF6633 40%, #CC3300 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,200,150,0.5), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 0 #992200, 0 6px 10px rgba(255,102,51,0.3)',
    },
  },
  virus: {
    bg: '', indicator: '🦠', text: 'text-white',
    style: {
      background: 'linear-gradient(180deg, #66FF66 0%, #33CC33 40%, #009900 100%)',
      boxShadow: 'inset 0 2px 5px rgba(200,255,200,0.5), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 0 #006600, 0 6px 10px rgba(51,204,51,0.3)',
    },
  },
  portal: {
    bg: '', indicator: '🔗', text: 'text-white',
    style: {
      background: 'radial-gradient(circle, #7B68EE 0%, #4B0082 60%, #2E0054 100%)',
      boxShadow: 'inset 0 2px 5px rgba(200,180,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.3), 0 4px 0 #1A0040, 0 6px 10px rgba(75,0,130,0.4), 0 0 14px rgba(123,104,238,0.25)',
    },
  },
  catalyst: {
    bg: '', indicator: '⚗️', text: 'text-neo-navy',
    style: {
      background: 'linear-gradient(180deg, #FFFACD 0%, #FFD700 40%, #DAA520 100%)',
      boxShadow: 'inset 0 2px 5px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.15), 0 4px 0 #B8860B, 0 6px 10px rgba(218,165,32,0.3), 0 0 12px rgba(255,215,0,0.15)',
    },
  },
};

/** Clearing phase background color per tile type */
export const CLEARING_COLORS: Partial<Record<BlastTileType, { background: string; border: string }>> = {
  gold:      { background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', border: '2px solid rgba(255,215,0,0.8)' },
  bomb:      { background: 'radial-gradient(circle, #FF4444 0%, #CC0000 100%)', border: '2px solid rgba(255,50,50,0.8)' },
  rainbow:   { background: 'linear-gradient(135deg, #FF69B4 0%, #A855F7 50%, #00BFFF 100%)', border: '2px solid rgba(168,85,247,0.8)' },
  ice:       { background: 'linear-gradient(135deg, #B4E6FF 0%, #82C8FF 100%)', border: '2px solid rgba(150,220,255,0.8)' },
  lightning: { background: 'linear-gradient(135deg, #FFE100 0%, #00BFFF 100%)', border: '2px solid rgba(255,225,0,0.8)' },
  prism:     { background: 'conic-gradient(from 0deg, #f00, #f90, #ff0, #0f0, #06f, #93f, #f00)', border: '2px solid rgba(255,255,255,0.8)' },
  gem:       { background: 'radial-gradient(circle, #50C878 0%, #009450 100%)', border: '2px solid rgba(80,200,120,0.8)' },
  frozen:    { background: 'linear-gradient(135deg, #C8DCFF 0%, #A0C8F0 100%)', border: '2px solid rgba(180,220,255,0.8)' },
  magnet:    { background: 'radial-gradient(circle, #8B00FF 0%, #FF0040 100%)', border: '2px solid rgba(139,0,255,0.8)' },
  mirror:    { background: 'radial-gradient(circle, #E0E0FF 0%, #8888FF 100%)', border: '2px solid rgba(136,136,255,0.8)' },
  silver:    { background: 'radial-gradient(circle, #E8E8E8 0%, #B0B0B0 100%)', border: '2px solid rgba(192,192,192,0.8)' },
  diamond:   { background: 'radial-gradient(circle, #B9F2FF 0%, #00CED1 100%)', border: '2px solid rgba(0,206,209,0.8)' },
  wildcard:  { background: 'radial-gradient(circle, #E8B4F8 0%, #9333EA 100%)', border: '2px solid rgba(192,132,252,0.8)' },
  countdown: { background: 'radial-gradient(circle, #FF9966 0%, #CC3300 100%)', border: '2px solid rgba(255,102,51,0.8)' },
  virus:     { background: 'radial-gradient(circle, #66FF66 0%, #009900 100%)', border: '2px solid rgba(51,204,51,0.8)' },
  portal:    { background: 'radial-gradient(circle, #7B68EE 0%, #2E0054 100%)', border: '2px solid rgba(123,104,238,0.8)' },
  catalyst:  { background: 'radial-gradient(circle, #FFD700 0%, #DAA520 100%)', border: '2px solid rgba(218,165,32,0.8)' },
};

/** Type-specific clearing transform overrides — visually distinct death animations.
 * Each type has a UNIQUE signature: bombs explode outward, ice shatters inward,
 * lightning stretches vertically, magnet implodes with spin, etc. */
export const CLEARING_ANIMS: Partial<Record<BlastTileType, { transform: string; transition: string; filter?: string }>> = {
  bomb:      { transform: 'scale(2.2) rotate(15deg)', transition: 'all 200ms cubic-bezier(0.17, 0.67, 0.83, 0.67)', filter: 'brightness(2.5) saturate(2)' },
  lightning: { transform: 'scaleY(3.5) scaleX(0.15) translateY(-30%)', transition: 'all 140ms ease-in', filter: 'brightness(3) contrast(1.5)' },
  prism:     { transform: 'scale(2.0) rotate(270deg)', transition: 'all 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', filter: 'hue-rotate(180deg) brightness(1.8)' },
  ice:       { transform: 'scale(0.3) rotate(25deg) translateY(10px)', transition: 'all 180ms cubic-bezier(0.55, 0.06, 0.68, 0.19)', filter: 'brightness(2) blur(2px)' },
  frozen:    { transform: 'scale(0.1) rotate(-45deg)', transition: 'all 250ms cubic-bezier(0.55, 0.06, 0.68, 0.19)', filter: 'brightness(1.5) blur(3px)' },
  gem:       { transform: 'scale(1.8) rotate(90deg)', transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'brightness(2) saturate(3)' },
  gold:      { transform: 'scale(1.6) rotate(-20deg)', transition: 'all 200ms ease-out', filter: 'brightness(2.5) saturate(2)' },
  silver:    { transform: 'scale(1.3) translateY(-15px)', transition: 'all 180ms ease-out', filter: 'brightness(2)' },
  rainbow:   { transform: 'scale(2.0) rotate(540deg)', transition: 'all 350ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'hue-rotate(360deg) brightness(2)' },
  magnet:    { transform: 'scale(0.05) rotate(1080deg)', transition: 'all 300ms cubic-bezier(0.36, 0, 0.66, -0.56)', filter: 'brightness(0.3) saturate(3)' },
  mirror:    { transform: 'scaleX(0) scaleY(1.8)', transition: 'all 180ms ease-in', filter: 'brightness(3)' },
  diamond:   { transform: 'scale(1.9) rotate(45deg)', transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'brightness(3) saturate(2)' },
  wildcard:  { transform: 'scale(1.5) rotate(360deg)', transition: 'all 250ms ease-out', filter: 'brightness(2) hue-rotate(90deg)' },
  countdown: { transform: 'scale(2.5) rotate(30deg)', transition: 'all 180ms cubic-bezier(0.17, 0.67, 0.83, 0.67)', filter: 'brightness(3) saturate(2.5)' },
  virus:     { transform: 'scale(0.2) rotate(-90deg)', transition: 'all 200ms cubic-bezier(0.55, 0.06, 0.68, 0.19)', filter: 'brightness(0.5) saturate(3)' },
  portal:    { transform: 'scale(0.01) rotate(720deg)', transition: 'all 350ms cubic-bezier(0.36, 0, 0.66, -0.56)', filter: 'brightness(2) blur(2px)' },
  catalyst:  { transform: 'scale(2.0) rotate(-15deg)', transition: 'all 220ms ease-out', filter: 'brightness(2.5) saturate(2)' },
};
