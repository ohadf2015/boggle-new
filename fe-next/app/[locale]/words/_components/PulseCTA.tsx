'use client';

import Link from 'next/link';

/**
 * CTA button with subtle pulse glow animation to draw attention.
 * Pure CSS animation — no JS overhead.
 */
export function PulseCTA({
  href,
  children,
  color = 'lime',
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  color?: 'lime' | 'cyan' | 'pink';
  className?: string;
}) {
  const colorMap = {
    lime: {
      bg: 'bg-neo-lime',
      text: 'text-neo-black',
      glow: 'shadow-[0_0_20px_rgba(191,255,0,0.4)]',
      pulseGlow: 'rgba(191,255,0,0.3)',
    },
    cyan: {
      bg: 'bg-neo-cyan',
      text: 'text-neo-black',
      glow: 'shadow-[0_0_20px_rgba(0,255,255,0.4)]',
      pulseGlow: 'rgba(0,255,255,0.3)',
    },
    pink: {
      bg: 'bg-neo-pink',
      text: 'text-neo-white',
      glow: 'shadow-[0_0_20px_rgba(255,20,147,0.4)]',
      pulseGlow: 'rgba(255,20,147,0.3)',
    },
  };

  const c = colorMap[color];

  return (
    <Link
      href={href}
      className={`
        relative shrink-0 ${c.bg} ${c.text} font-neo-display font-black
        px-6 py-3 rounded-neo border-3 border-neo-black
        shadow-hard hover:shadow-hard-pressed active:translate-y-0.5
        transition-all group
        ${className}
      `}
    >
      {/* Pulse ring */}
      <span
        className="absolute inset-0 rounded-neo animate-pulse-ring pointer-events-none motion-reduce:hidden"
        style={{
          boxShadow: `0 0 0 0 ${c.pulseGlow}`,
        }}
      />
      <span className="relative z-10">{children}</span>
    </Link>
  );
}
