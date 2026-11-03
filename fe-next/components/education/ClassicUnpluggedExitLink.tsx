'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';

export function ClassicUnpluggedExitLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      data-testid="unplugged-exit"
      // Cream edge: a black border on navy scores ~1.2:1 and the control disappears.
      className={cn('focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black',
        'shrink-0 grid place-items-center w-11 h-11 rounded-neo border-[3px] border-neo-cream bg-neo-navy text-neo-cream shadow-hard-sm',
        className,
      )}
    >
      <DirectionalIcon icon={ArrowLeft} className="w-4 h-4 sm:w-5 sm:h-5" />
    </Link>
  );
}
