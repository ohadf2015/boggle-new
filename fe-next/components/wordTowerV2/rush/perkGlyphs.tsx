import type { ReactNode } from "react";
import type { BlockTrait, PerkId } from "@/lib/wordTowerV2/rush/types";

interface GlyphProps {
  className?: string;
}

const STROKE = "stroke-neo-black";

function Svg({ className, children }: GlyphProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      className={`${STROKE} ${className ?? "h-8 w-8"}`}
      fill="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {children}
    </svg>
  );
}

const MAGNET = (
  <>
    <path d="M5 4h4v8a3 3 0 0 0 6 0V4h4v8a7 7 0 0 1-14 0z" />
    <path d="M5 7h4M15 7h4" fill="none" />
  </>
);

const PERK_ART: Record<PerkId, ReactNode> = {
  wideLoad: (
    <>
      <rect x="4" y="9" width="16" height="7" rx="1" />
      <path d="M1.5 12.5 4 10.5v4zM22.5 12.5 20 10.5v4z" />
    </>
  ),
  steadyHands: (
    <>
      <rect x="2" y="8" width="20" height="8" rx="2" />
      <circle cx="12" cy="12" r="2.5" fill="none" />
      <path d="M8 8v8M16 8v8" fill="none" />
    </>
  ),
  longWordBonus: (
    <>
      <rect x="1.5" y="12" width="6" height="7" rx="1" />
      <rect x="9" y="9" width="6" height="10" rx="1" />
      <rect x="16.5" y="5" width="6" height="14" rx="1" />
    </>
  ),
  perfectStreak: <path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6z" />,
  goldRush: (
    <>
      <path d="M3 18h8l-1.5-5h-5z" />
      <path d="M13 18h8l-1.5-5h-5z" />
      <path d="M8 12h8l-1.5-5h-5z" />
    </>
  ),
  slowSwing: (
    <>
      <path d="M12 2v9" fill="none" />
      <path d="M4 7a10 10 0 0 0 16 0" fill="none" strokeDasharray="2 3" />
      <rect x="7" y="11" width="10" height="8" rx="1" />
    </>
  ),
  safetyNet: (
    <>
      <path d="M2 9c3 6 17 6 20 0" />
      <path
        d="M7 11.5 8.5 14M12 12v2.8M17 11.5 15.5 14M4.5 11h15"
        fill="none"
      />
      <path d="M2 9V5M22 9V5" fill="none" />
    </>
  ),
  luckyCrates: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="1" />
      <path d="M3 11h18" fill="none" />
      <path d="m12 1.5 1.6 3.2 3.4.4-2.5 2.3.7 3.4-3.2-1.8-3.2 1.8.7-3.4L7 5.1l3.4-.4z" />
    </>
  ),
  magnetBase: MAGNET,
  momentum: (
    <>
      <path d="m4 13 8-7 8 7-3 2.5-5-4.5-5 4.5z" />
      <path d="m4 20 8-7 8 7-3 2-5-4.5L7 22z" />
    </>
  ),
};

const TRAIT_ART: Record<BlockTrait, ReactNode> = {
  plain: <rect x="5" y="5" width="14" height="14" rx="2" />,
  gold: (
    <>
      <path d="M12 2 21 12 12 22 3 12z" />
      <path d="m12 7 5 5-5 5" fill="none" />
    </>
  ),
  feather: (
    <>
      <path d="M20 3C10 4 5 10 5 18l2 1c7 0 13-6 13-16z" />
      <path d="M3 21 14 10" fill="none" />
    </>
  ),
  anvil: (
    <>
      <path d="M2 6h14c0 3 3 4 6 4v2h-5l-2 3h2v4H7v-4h2l-2-3H5C3 12 2 9 2 6z" />
    </>
  ),
  magnet: MAGNET,
  lucky: (
    <>
      <circle cx="8.5" cy="8.5" r="4" />
      <circle cx="15.5" cy="8.5" r="4" />
      <circle cx="8.5" cy="15.5" r="4" />
      <circle cx="15.5" cy="15.5" r="4" />
    </>
  ),
};

export function PerkGlyph({ id, className }: GlyphProps & { id: PerkId }) {
  return <Svg className={className}>{PERK_ART[id]}</Svg>;
}

export function TraitGlyph({
  trait,
  className,
}: GlyphProps & { trait: BlockTrait }) {
  return <Svg className={className}>{TRAIT_ART[trait]}</Svg>;
}

export const TRAIT_FILL: Record<BlockTrait, string> = {
  plain: "bg-neo-cream text-neo-gray-500",
  gold: "bg-neo-yellow text-neo-orange",
  feather: "bg-neo-cyan text-neo-white",
  anvil: "bg-neo-gray-400 text-neo-navy",
  magnet: "bg-neo-pink text-neo-red",
  lucky: "bg-neo-lime text-neo-lime-dark",
};
