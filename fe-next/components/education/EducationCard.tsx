'use client';
import Link from 'next/link';
import { useScrollReveal } from '@/lib/animation/useScrollReveal';

interface Props {
  href: string;
  badge?: string;
  badgeColor?: 'neo-yellow' | 'neo-cyan' | 'neo-purple' | 'neo-pink' | 'neo-lime';
  title: string;
  description: string;
  children?: React.ReactNode;
}

/**
 * Reusable education card with:
 * - Scroll-reveal entrance
 * - Hover lift effect via shadow + translate
 * - Neo-brutalist styling
 */
export function EducationCard({
  href,
  badge,
  badgeColor = 'neo-yellow',
  title,
  description,
  children,
}: Props) {
  const [ref, visible] = useScrollReveal<HTMLAnchorElement>({ once: true });

  return (
    <Link
      ref={ref}
      href={href}
      className={`group block rounded-neo border-neo-thick border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all duration-300 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } hover:shadow-hard-lg hover:-translate-x-1 hover:-translate-y-1`}
    >
      {badge && (
        <span className={`inline-block border-2 border-neo-black bg-${badgeColor} px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy`}>
          {badge}
        </span>
      )}

      <h3 className="mt-3 font-neo-display text-base font-black uppercase text-neo-white">
        {title}
      </h3>

      <p className="mt-2 text-xs text-neo-gray-200">
        {description}
      </p>

      {children}
    </Link>
  );
}
