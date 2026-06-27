'use client';

/**
 * StylePicker — the genre mascot-button grid.
 *
 * Clicking a tile PREVIEWS it: the accent applies app-wide live (via
 * PlayerStyleContext.previewStyle) and a short music snippet plays. Nothing is
 * persisted until the user confirms, at which point the choice is saved to the
 * account or localStorage. The mascots ARE the buttons.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerStyle } from '@/contexts/PlayerStyleContext';
import { useStyleSnippetPreview } from '@/hooks/useStyleSnippetPreview';
import { STYLE_KEYS, STYLES, type PlayerStyleKey } from '@/lib/playerStyle/styles';
import { getAnimatedMascot } from '@/lib/playerStyle/animatedMascots';
import { buildStyledAvatarConfig } from '@/lib/playerStyle/styledAvatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import Avatar from '@/components/Avatar';
import { RefreshCw, Check } from 'lucide-react';

export interface StylePickerProps {
  /** Called after the choice is committed. */
  onConfirm?: (key: PlayerStyleKey) => void;
  /** i18n key for the confirm button label. */
  confirmLabelKey?: string;
  /** Show the confirm button (modal/onboarding). Off = caller owns the CTA. */
  showConfirm?: boolean;
  /** Extra node pinned in the always-visible footer (e.g. modal "keep default"). */
  footerExtra?: React.ReactNode;
  /**
   * Layout mode:
   * - 'modal' (default): the picker owns its own scroll region with a pinned
   *   footer. Correct inside the fixed-height modal/onboarding shells.
   * - 'inline': lays the grid out at its natural height and lets the host page
   *   scroll. Use on the normally-scrolling Settings page — the internal
   *   `overflow-y-auto` region otherwise traps the page scroll and makes
   *   everything below the picker unreachable.
   */
  layout?: 'modal' | 'inline';
}

export function StylePicker({
  onConfirm,
  confirmLabelKey = 'playerStyle.picker.confirm',
  showConfirm = true,
  footerExtra,
  layout = 'modal',
}: StylePickerProps) {
  const { t } = useLanguage();
  const { updateProfile } = useAuth();
  const { styleKey: committedKey, setStyle, previewStyle } = usePlayerStyle();
  const { playSnippet, stopSnippet } = useStyleSnippetPreview();

  const [selected, setSelected] = useState<PlayerStyleKey>(committedKey);
  const [saving, setSaving] = useState(false);

  // Opt-in: also generate a genre-themed avatar (base/face stay randomized).
  const [styleAvatar, setStyleAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<CustomAvatarConfig | null>(null);

  const rerollAvatar = useCallback((key: PlayerStyleKey) => {
    setAvatarPreview(buildStyledAvatarConfig(key));
  }, []);

  // Rebuild the avatar preview whenever the toggle turns on or the style changes.
  useEffect(() => {
    if (styleAvatar) setAvatarPreview(buildStyledAvatarConfig(selected));
    else setAvatarPreview(null);
  }, [styleAvatar, selected, rerollAvatar]);

  // Revert the live accent preview + stop audio when the picker unmounts,
  // unless the user committed (committing clears the preview itself).
  useEffect(() => {
    return () => {
      previewStyle(null);
      stopSnippet();
    };
  }, [previewStyle, stopSnippet]);

  const handleSelect = useCallback(
    (key: PlayerStyleKey) => {
      setSelected(key);
      previewStyle(key);
      playSnippet(STYLES[key].musicFile);
    },
    [previewStyle, playSnippet],
  );

  const handleConfirm = useCallback(async () => {
    setSaving(true);
    try {
      // Stop the preview FIRST: it ducks the global music volume to 0 while a
      // snippet plays. Committing the style swaps the live music bed (home/lobby/
      // game) — if we swap while still ducked, the new bed fades in at volume 0.
      // Restoring before the commit guarantees the new track is audible immediately.
      stopSnippet();
      await setStyle(selected);
      if (styleAvatar && avatarPreview) {
        await updateProfile({ avatar_config: avatarPreview, avatar_customized: true });
      }
      onConfirm?.(selected);
    } finally {
      setSaving(false);
    }
  }, [selected, styleAvatar, avatarPreview, setStyle, updateProfile, stopSnippet, onConfirm]);

  const isInline = layout === 'inline';

  return (
    <div className={isInline ? 'flex flex-col gap-4' : 'flex min-h-0 flex-1 flex-col gap-4'}>
      {/* Scrollable card region — bottom section stays pinned + always visible
          in 'modal'. In 'inline' the grid lays out at natural height and the
          host page owns the scroll (no nested scroll container to trap it). */}
      <div
        // modal: overscroll-contain + own compositor layer (translateZ) stops the
        // translucent backdrop behind the modal from repaint-flickering as this
        // region scrolls on touch devices.
        className={
          isInline
            ? 'grid grid-cols-2 content-start gap-3 px-4 pb-1 pt-4 sm:grid-cols-3'
            : 'grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto overscroll-contain px-4 pb-1 pt-4 [transform:translateZ(0)] [backface-visibility:hidden] sm:grid-cols-3'
        }
        role="radiogroup"
        aria-label={t('playerStyle.picker.title')}
      >
        {STYLE_KEYS.map((key) => {
          const style = STYLES[key];
          const isSelected = selected === key;
          const isCurrent = committedKey === key;
          // The active tile (being selected, or the committed style) plays its
          // real dancing loop; the rest stay as the lightweight static art.
          const animated = getAnimatedMascot(key);
          const dancing = (isSelected || isCurrent) && !!animated;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(key)}
              className={[
                'group relative flex flex-col items-center gap-1.5 rounded-neo border-neo-thick p-3 transition-all duration-150',
                isSelected
                  ? 'z-10 -translate-y-1 border-accent bg-accent/20 shadow-hard-lg ring-4 ring-accent ring-offset-2 ring-offset-neo-navy'
                  : 'border-neo-black bg-neo-navy-light shadow-hard hover:-translate-y-0.5 active:translate-y-0',
              ].join(' ')}
            >
              {isSelected && (
                <span className="absolute -start-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full border-neo border-neo-black bg-accent text-neo-black shadow-hard-sm">
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-2 -inset-e-2 z-20 rounded-full border-neo border-neo-black bg-accent px-1.5 py-0.5 text-[9px] font-neo-display font-bold text-neo-black">
                  {t('playerStyle.picker.current')}
                </span>
              )}
              <span className="relative aspect-square w-full overflow-hidden rounded-neo bg-neo-navy">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dancing ? animated! : style.mascot}
                  alt=""
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </span>
              <span
                className={[
                  'font-neo-body text-sm leading-tight',
                  isSelected ? 'font-bold text-accent' : 'text-neo-cream',
                ].join(' ')}
              >
                {style.emoji} {t(style.labelKey)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pinned footer — avatar opt-in + confirm + caller extras stay in view. */}
      <div className="flex shrink-0 flex-col gap-3 border-t-2 border-neo-black/40 pt-3">
      {/* Opt-in: match the avatar to the style (genre parts + accent, random face) */}
      <div className="flex items-center justify-center gap-3 rounded-neo border-neo border-neo-black bg-neo-navy-light p-2.5">
        <label className="flex cursor-pointer items-center gap-2 font-neo-body text-xs text-neo-cream">
          <input
            type="checkbox"
            checked={styleAvatar}
            onChange={(e) => setStyleAvatar(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          {t('playerStyle.picker.matchAvatar')}
        </label>
        {styleAvatar && avatarPreview && (
          <div className="flex items-center gap-2">
            <span className="rounded-full ring-2 ring-accent">
              <Avatar customAvatar={avatarPreview} size="sm" />
            </span>
            <button
              type="button"
              onClick={() => rerollAvatar(selected)}
              aria-label={t('playerStyle.picker.shuffleAvatar')}
              title={t('playerStyle.picker.shuffleAvatar')}
              className="rounded-neo border-neo border-neo-black bg-neo-navy p-1.5 text-neo-cream hover:bg-neo-navy-elevated"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {showConfirm && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="self-center rounded-neo border-neo-thick border-neo-black bg-accent px-6 py-2.5 font-neo-display text-base font-bold text-neo-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed disabled:opacity-60"
        >
          {t(confirmLabelKey)}
        </button>
      )}

        {footerExtra}
      </div>
    </div>
  );
}

export default StylePicker;
