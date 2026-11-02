'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface ToolbarAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Destructive action: the first tap arms it and shows this label; the second tap runs it. */
  confirmLabel?: string;
}

const DISARM_MS = 3000;

/**
 * One segmented strip instead of a row of separate heavy buttons: the keyboard below is the
 * primary control, so the helpers read as a quiet secondary group. Labels wrap, never truncate —
 * the verb must stay readable at any width and in any locale.
 */
export function CrosswordToolbar({ actions }: { actions: ToolbarAction[] }) {
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const press = (a: ToolbarAction) => {
    if (timer.current) clearTimeout(timer.current);
    if (a.confirmLabel && armed !== a.key) {
      setArmed(a.key);
      timer.current = setTimeout(() => setArmed(null), DISARM_MS);
      return;
    }
    setArmed(null);
    a.onClick();
  };

  return (
    <div
      role="toolbar"
      className="grid w-full auto-cols-fr grid-flow-col overflow-hidden rounded-neo border-neo border-neo-cream/40 bg-neo-navy-light"
    >
      {actions.map((a, i) => (
        <button
          key={a.key}
          type="button"
          onClick={() => press(a)}
          className={`flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 font-neo-body text-[0.68rem] font-semibold leading-tight text-neo-white transition-colors hover:bg-neo-white/10 active:bg-neo-white/15 lg:flex-row lg:gap-2 lg:px-3 lg:py-2.5 lg:text-sm ${
            i > 0 ? 'border-s-2 border-neo-cream/20' : ''
          }`}
        >
          <span className={armed === a.key ? 'text-neo-red' : 'text-neo-cyan'} aria-hidden>
            {a.icon}
          </span>
          <span className={`text-center ${armed === a.key ? 'font-bold text-neo-red' : ''}`}>
            {armed === a.key && a.confirmLabel ? a.confirmLabel : a.label}
          </span>
        </button>
      ))}
    </div>
  );
}
