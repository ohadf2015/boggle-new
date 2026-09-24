'use client';

/**
 * Editor color + body-type controls: a single-row swatch strip (scrolls
 * sideways, never grows the page) and a compact body-type toggle.
 */
import { Check, Lock } from 'lucide-react';
import { AVATAR_GENDERS, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { CatalogColor } from '@/lib/avatar/catalog';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import { getPartLockInfo, type LockPremium } from './editor/partLock';

export interface SwatchRowProps {
  label: string;
  colors: readonly CatalogColor[];
  selected: string | undefined;
  /** Hex being tried on (locked premium color), if any. */
  tryOnHex: string | null;
  premium: LockPremium | null;
  onPick: (color: CatalogColor) => void;
  /** Wrap onto several lines (scroll-area rows) instead of one sideways strip. */
  wrap?: boolean;
}

/** Relative luminance → pick a check color that reads on the swatch. */
function isLight(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}

export function SwatchRow({ label, colors, selected, tryOnHex, premium, onPick, wrap }: SwatchRowProps) {
  return (
    <div role="group" aria-label={label} className="min-w-0">
      <p className="text-neo-white/80 text-[11px] font-black uppercase tracking-wider mb-1">{label}</p>
      <div className={`flex gap-2 ${wrap ? 'flex-wrap' : 'overflow-x-auto avatar-editor-noscrollbar py-1 -my-1 px-1 -mx-1'}`}>
        {colors.map(c => {
          const info = getPartLockInfo(c.palette, c.hex, premium);
          const isSel = selected?.toLowerCase() === c.hex.toLowerCase();
          const isTry = tryOnHex === c.hex;
          const special = info.rarity !== 'common';
          return (
            <button
              key={c.hex}
              type="button"
              aria-label={c.hex}
              aria-pressed={isSel}
              data-locked={info.locked ? 'true' : 'false'}
              onClick={() => onPick(c)}
              className={`relative shrink-0 w-9 h-9 rounded-full border-[3px] transition-transform duration-150 active:scale-90 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan ${
                isSel
                  ? 'border-neo-lime ring-2 ring-neo-lime/50 ring-offset-2 ring-offset-neo-navy'
                  : isTry
                    ? 'border-dashed border-neo-cyan'
                    : 'border-black'
              }`}
              style={{ backgroundColor: c.hex, ...(special && !isSel && !isTry ? { borderColor: RARITY_TOKENS[info.rarity].hex } : null) }}
            >
              {isSel && (
                <Check size={16} strokeWidth={4} aria-hidden="true" className={`absolute inset-0 m-auto ${isLight(c.hex) ? 'text-neo-black' : 'text-neo-white'}`} />
              )}
              {!isSel && info.locked && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-neo-navy border-2 border-black flex items-center justify-center">
                  <Lock size={8} strokeWidth={3} aria-hidden="true" className="text-neo-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface GenderToggleProps {
  label: string;
  selected: CustomAvatarConfig['gender'];
  onSelect: (value: CustomAvatarConfig['gender']) => void;
  t: (key: string) => string;
}

export function GenderToggle({ label, selected, onSelect, t }: GenderToggleProps) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 gap-1 p-1 rounded-neo bg-neo-navy-light border-2 border-black self-end">
      {AVATAR_GENDERS.map(gender => (
        <button
          key={gender}
          type="button"
          role="radio"
          aria-checked={selected === gender}
          onClick={() => onSelect(gender)}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-black rounded-[6px] transition-colors ${
            selected === gender ? 'bg-neo-lime text-neo-black shadow-hard-sm' : 'text-neo-white/80 hover:text-neo-white'
          }`}
        >
          <span aria-hidden="true" className="text-sm leading-none">{gender === 'male' ? '♂' : '♀'}</span>
          <span>{t(`avatarBuilder.${gender}`)}</span>
        </button>
      ))}
    </div>
  );
}
