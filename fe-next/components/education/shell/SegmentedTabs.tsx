'use client';

import type { CSSProperties, KeyboardEvent, ComponentType } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedTabItem<K extends string> {
  key: K;
  label: string;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
  count?: number;
}

export interface SegmentedTabsProps<K extends string> {
  items: readonly SegmentedTabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  ariaLabel: string;
  /** Tabs get `${idPrefix}-tab-${key}`; the caller's panels use `${idPrefix}-panel-${key}`. */
  idPrefix: string;
  className?: string;
}

export function SegmentedTabs<K extends string>({ items, value, onChange, ariaLabel, idPrefix, className }: SegmentedTabsProps<K>) {
  const index = Math.max(0, items.findIndex((item) => item.key === value));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const step = (e.key === 'ArrowRight') !== rtl ? 1 : -1;
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + step + items.length) % items.length;
    onChange(items[next].key);
    e.currentTarget.querySelector<HTMLButtonElement>(`#${idPrefix}-tab-${items[next].key}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      className={cn('relative grid rounded-neo border-[3px] border-neo-cream bg-neo-navy-light p-1', className)}
    >
      <span
        aria-hidden="true"
        data-testid="segmented-indicator"
        style={{ '--seg-i': String(index), '--seg-n': String(items.length) } as CSSProperties}
        className={cn(
          'pointer-events-none absolute inset-y-1 start-1 w-[calc((100%-0.5rem)/var(--seg-n))] rounded-neo',
          'border-[2px] border-neo-black bg-neo-cream shadow-hard-sm',
          'translate-x-[calc(var(--seg-i)*100%)] rtl:translate-x-[calc(var(--seg-i)*-100%)]',
          'transition-[translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
        )}
      />
      {items.map(({ key, label, icon: Icon, count }) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${key}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${key}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(key)}
            className={cn(
              'relative z-10 inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-neo px-3',
              'font-neo-display text-sm font-bold transition-[color,transform] duration-150 ease-out active:scale-[0.97]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan',
              active ? 'text-neo-black' : 'text-neo-cream/75 [@media(hover:hover)]:hover:text-neo-cream',
            )}
          >
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
            <span className="truncate">{label}</span>
            {count !== undefined ? (
              <span className={cn('rounded-full px-1.5 text-xs tabular-nums', active ? 'bg-neo-black/10' : 'bg-neo-cream/15')}>{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedTabs;
