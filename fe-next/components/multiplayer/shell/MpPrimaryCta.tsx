'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MpPrimaryCtaProps {
  label: string;
  sublabel?: string;
  tone: 'lime' | 'pink' | 'cyan';
  badge?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  testId?: string;
}

const TONE = { lime: 'success', pink: 'accent', cyan: 'cyan' } as const;

/** The footer's one primary action: 64px on phone, 96px on TV (64 × --mp-u). */
export function MpPrimaryCta({ label, sublabel, tone, badge, onPress, disabled, loading, className, testId = 'mp-primary-cta' }: MpPrimaryCtaProps) {
  const inert = disabled || loading;
  return (
    <Button
      type="button"
      variant={TONE[tone]}
      data-testid={testId}
      disabled={inert}
      aria-busy={loading ? true : undefined}
      onClick={inert ? undefined : onPress}
      className={cn(
        'relative w-full h-[calc(64px*var(--mp-u,1))] min-h-[calc(64px*var(--mp-u,1))] flex-col gap-0 font-neo-display font-bold uppercase text-xl tv:text-3xl',
        className,
      )}
    >
      {loading ? <Loader2 aria-hidden="true" className="animate-spin" /> : <span className="leading-tight">{label}</span>}
      {sublabel && !loading && <span className="text-xs font-neo-body normal-case opacity-80 leading-tight">{sublabel}</span>}
      {badge && (
        <span className="absolute -top-2 end-2 rounded-full border-2 border-neo-black bg-neo-yellow px-2 text-[10px] text-neo-black">
          {badge}
        </span>
      )}
    </Button>
  );
}
