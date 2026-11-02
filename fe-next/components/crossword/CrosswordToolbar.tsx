'use client';

import type { ReactNode } from 'react';

export interface ToolbarAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

/**
 * One segmented strip instead of a row of separate heavy buttons: the keyboard below is the
 * primary control, so the helpers read as a quiet secondary group. Labels wrap, never truncate —
 * the verb must stay readable at any width and in any locale.
 */
export function CrosswordToolbar({ actions }: { actions: ToolbarAction[] }) {
  return (
    <div
      role="toolbar"
      className="grid w-full auto-cols-fr grid-flow-col overflow-hidden rounded-neo border-neo border-neo-cream/40 bg-neo-navy-light"
    >
      {actions.map((a, i) => (
        <button
          key={a.key}
          type="button"
          onClick={a.onClick}
          className={`flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 font-neo-body text-[0.68rem] font-semibold leading-tight text-neo-white transition-colors hover:bg-neo-white/10 active:bg-neo-white/15 lg:flex-row lg:gap-2 lg:px-3 lg:py-2.5 lg:text-sm ${
            i > 0 ? 'border-s-2 border-neo-cream/20' : ''
          }`}
        >
          <span className="text-neo-cyan" aria-hidden>
            {a.icon}
          </span>
          <span className="text-center">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
