'use client';

import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface MpRoomCodeProps {
  code: string;
  /** `chip` 28px header chip · `hero` projector/invite size. */
  size: 'chip' | 'hero';
  onCopy: (code: string) => void;
  className?: string;
}

/** Letter-spaced Fredoka room code; tap copies it and stamps "copied". */
export function MpRoomCode({ code, size, onCopy, className }: MpRoomCodeProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      /* clipboard blocked — still report the tap so callers can open the invite sheet */
    }
    setCopied(true);
    onCopy(code);
  };

  return (
    <button
      type="button"
      onClick={copy}
      data-size={size}
      data-copied={String(copied)}
      aria-label={t('mpUi.shell.copyCode')}
      dir="ltr"
      className={cn(
        'relative inline-flex items-center gap-2 rounded-neo border-2 border-neo-black bg-neo-navy-light font-neo-display font-bold uppercase text-neo-white shadow-hard-sm',
        size === 'chip' ? 'h-10 px-3 text-[calc(28px*var(--mp-u,1))] tracking-[0.2em]' : 'px-6 py-3 text-[calc(56px*var(--mp-u,1))] tracking-[0.25em]',
        className,
      )}
    >
      <span>{code}</span>
      {size === 'chip' && <Copy aria-hidden="true" className="w-4 h-4 opacity-70" />}
      {copied && (
        <span className="absolute -top-3 end-0 rounded-full bg-neo-lime px-2 text-xs tracking-normal text-neo-black animate-mp-stamp">
          {t('mpUi.shell.copied')}
        </span>
      )}
    </button>
  );
}
