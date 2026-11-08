import type { ReactNode } from 'react';

interface QuickDetailCardProps {
  testId: string;
  /** Header band colour, e.g. bg-neo-pink. */
  band: string;
  title: ReactNode;
  aside?: ReactNode;
  /** Classes for the body under the band. */
  bodyClassName?: string;
  children: ReactNode;
}

export function QuickDetailCard({ testId, band, title, aside, bodyClassName = '', children }: QuickDetailCardProps) {
  return (
    <div
      className="qp-reveal overflow-hidden rounded-2xl border-neo-thick border-black bg-neo-navy-elevated shadow-hard"
      data-testid={testId}
    >
      <div
        className={`flex items-center justify-between gap-2 border-b-[3px] border-black px-3 py-1.5 text-black ${band}`}
        data-testid={`${testId}-band`}
      >
        <span className="min-w-0 truncate font-neo-display text-[11px] font-bold uppercase tracking-[0.16em]">{title}</span>
        {aside && <span className="shrink-0 font-neo-display text-xs font-bold">{aside}</span>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
