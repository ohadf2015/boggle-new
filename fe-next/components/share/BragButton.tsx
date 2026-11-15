'use client';

import type { MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPlaceholderName } from '@/lib/displayName';
import type { BragKind } from '@/lib/results/bragOgModel';
import { cn } from '@/lib/utils';
import { isGeneratedName } from '@/utils/defaultPlayerNames';
import { runBragShare } from '@/utils/bragShare';

const STUDENT_SEGMENTS = new Set(['student', 'join', 'classroom']);

function onStudentRoute(pathname: string | null): boolean {
  return !!pathname && pathname.split('/').some((s) => STUDENT_SEGMENTS.has(s));
}

/** Students may be minors: they never get a brag link, and nobody's name rides on one unless they chose it. */
export function useBragSharer(): { canBrag: boolean; me: string | null } {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const isStudent =
    loading ||
    user?.is_anonymous === true ||
    profile?.user_role === 'student' ||
    onStudentRoute(pathname);
  if (isStudent) return { canBrag: false, me: null };
  const name = (profile?.display_name || profile?.username || '').trim();
  const me = name && !isPlaceholderName(name) && !isGeneratedName(name) ? name.slice(0, 24) : null;
  return { canBrag: true, me };
}

export interface BragButtonProps {
  surface: string;
  kind: BragKind;
  text: string;
  url: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  onShareStart?: () => void;
}

export function BragButton({ surface, kind, text, url, label, size = 'md', className, onShareStart }: BragButtonProps) {
  const { t } = useLanguage();
  const { canBrag } = useBragSharer();
  if (!canBrag) return null;

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onShareStart?.();
    await runBragShare({ text, url, surface, kind, copiedLabel: t('share.linkCopied') });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={`brag-button-${surface}`}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-yellow font-neo-display font-black uppercase text-neo-black shadow-hard-sm transition-transform motion-safe:hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none',
        size === 'sm' ? 'px-3 text-xs' : 'px-4 text-sm',
        className,
      )}
    >
      <Share2 className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
      <span>{label ?? t('brag2.button.brag')}</span>
    </button>
  );
}

export default BragButton;
