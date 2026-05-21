import type { ReactNode } from 'react';
import { playStoreUrlWithReferrer } from '../utils/androidApp';

interface PlayStoreCTAProps {
  /** Install-attribution campaign — usually the landing page slug. */
  campaign: string;
  /** Locale path segment; lands in utm_content for per-language attribution. */
  locale: string;
  /** Localizable eyebrow line above the wordmark (e.g. "GET IT ON"). */
  label: string;
  /** Screen-reader label; defaults to `${label} Google Play`. */
  ariaLabel?: string;
  /** Extra classes for the anchor. */
  className?: string;
}

/**
 * Official-style "Get it on Google Play" badge, rendered as inline SVG inside a
 * neo-brutalist frame. Links to the Play Store with an install referrer so SEO
 * installs are attributable. The 4-colour triangle is a stylised Play mark; the
 * "Google Play" wordmark + eyebrow carry the recognition.
 */
export default function PlayStoreCTA({
  campaign,
  locale,
  label,
  ariaLabel,
  className = '',
}: PlayStoreCTAProps): ReactNode {
  const href = playStoreUrlWithReferrer(campaign, locale);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel ?? `${label} Google Play`}
      className={`inline-flex items-center gap-3 rounded-neo border-3 border-neo-black bg-neo-black px-5 py-3 shadow-hard transition-all hover:shadow-hard-lg hover:-translate-y-0.5 ${className}`}
    >
      <svg
        viewBox="0 0 24 26"
        width="28"
        height="30"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* 4-facet Play triangle fanning from the left-centre vertex (2,13) */}
        <polygon points="2,13 2,2 12,7.5" fill="#00C566" />
        <polygon points="2,13 12,7.5 22,13" fill="#00A1FF" />
        <polygon points="2,13 22,13 12,18.5" fill="#FFC400" />
        <polygon points="2,13 12,18.5 2,24" fill="#FF424A" />
      </svg>
      <span className="flex flex-col items-start leading-none text-neo-white">
        <span className="text-[10px] font-bold uppercase tracking-widest text-neo-white/80">
          {label}
        </span>
        <span className="font-neo-display text-xl font-black tracking-tight">Google Play</span>
      </span>
    </a>
  );
}
