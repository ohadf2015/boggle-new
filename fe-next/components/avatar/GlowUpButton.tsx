/**
 * GlowUpButton — ADMIN-ONLY entry point for the AI avatar Glow-Up (Track B).
 *
 * Renders nothing for non-admins. For admins: a button that rasterizes the live
 * builder preview avatar and requests a premium Higgsfield hero portrait, then
 * shows the result inline. Additive — does not change the saved avatar.
 * See docs/superpowers/specs/2026-06-20-higgsfield-avatar-system-design.md (Track B).
 */

'use client';

import { useCallback, type RefObject } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatarGlowUp } from '@/hooks/useAvatarGlowUp';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface GlowUpButtonProps {
  previewRef: RefObject<HTMLDivElement | null>;
  config: CustomAvatarConfig;
}

export default function GlowUpButton({ previewRef, config }: GlowUpButtonProps) {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const { generate, loading, resultUrl, error } = useAvatarGlowUp();

  const handleClick = useCallback(() => {
    const svgEl = previewRef.current?.querySelector('svg');
    if (!svgEl) return;
    void generate(svgEl as SVGSVGElement, config);
  }, [previewRef, config, generate]);

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col items-center gap-2 px-4 pb-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-black bg-neo-purple text-neo-white font-bold shadow-hard disabled:opacity-60 disabled:cursor-not-allowed transition-transform active:translate-y-px"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        <span>{loading ? t('avatarBuilder.glowUp.loading') : t('avatarBuilder.glowUp.button')}</span>
        <span className="text-[10px] font-black uppercase bg-black/30 px-1.5 py-0.5 rounded">
          {t('avatarBuilder.glowUp.adminTag')}
        </span>
      </button>

      {error && (
        <p className="text-neo-red text-xs font-bold" role="alert">
          {error}
        </p>
      )}

      {resultUrl && (
        <figure className="flex flex-col items-center gap-1">
          <figcaption className="text-neo-cream text-xs font-bold">
            {t('avatarBuilder.glowUp.resultTitle')}
          </figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resultUrl}
            alt={t('avatarBuilder.glowUp.resultTitle')}
            className="w-32 h-32 rounded-neo-lg border-3 border-black shadow-hard object-cover"
          />
        </figure>
      )}
    </div>
  );
}
