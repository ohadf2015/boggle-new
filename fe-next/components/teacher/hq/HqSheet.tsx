"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HqSheetProps {
  /** Test id on the `<details>` element itself. */
  testId: string;
  /** Marker for the sheet body (`data-hq-sheet`) — the page's one scroll region excludes sheets. */
  sheetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ReactNode;
  summaryClassName?: string;
  title: string;
  closeLabel: string;
  className?: string;
  /**
   * Mount the body only while open. Required for any sheet whose content
   * records an impression on mount (the Pro asks fire `iap_viewed`) — a closed
   * `<details>` still mounts its children, which would be a phantom impression.
   */
  mountWhenOpen?: boolean;
  /**
   * No visible trigger of its own — the sheet is opened from elsewhere (the
   * Tools sheet's "Word lists" tile, a deep link). The `<details>` stays so the
   * open state, deep links and tests keep one shape.
   */
  hideSummary?: boolean;
  children: ReactNode;
}

/**
 * A dock button that opens a sheet over Teacher HQ.
 *
 * Built on `<details>`: the closed state is real HTML — children stay mounted
 * (deep links, tests and data hooks keep working) but the browser renders
 * none of it. Anything inside that reports an impression must gate on `open`
 * itself (the Tools checklist and ProGate do). Only the OPEN sheet is a
 * dialog and a scroll region, so a closed sheet is neither announced nor
 * counted. The open body is a fixed overlay — secondary surfaces never grow
 * the deck past the viewport.
 * Bottom sheet on a phone, centred panel from `md`. The summary is covered once
 * the sheet opens, so the sheet carries its own close button, backdrop click
 * and Escape.
 *
 * Must not sit under a transformed ancestor: a non-`none` transform turns
 * `position: fixed` into "fixed to that ancestor".
 */
export function HqSheet({
  testId,
  sheetId,
  open,
  onOpenChange,
  summary,
  summaryClassName,
  title,
  closeLabel,
  className,
  mountWhenOpen = false,
  hideSummary = false,
  children,
}: HqSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <details
      data-testid={testId}
      open={open}
      onToggle={(e) => {
        const next = (e.currentTarget as HTMLDetailsElement).open;
        if (next !== open) onOpenChange(next);
      }}
      className={cn("group min-w-0", className)}
    >
      <summary
        hidden={hideSummary || undefined}
        className={cn(
          "list-none marker:content-none [&::-webkit-details-marker]:hidden",
          summaryClassName,
        )}
      >
        {summary}
      </summary>

      <div
        data-hq-sheet={sheetId}
        className="fixed inset-0 z-[110] flex items-end justify-center bg-black/65 md:items-center md:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onOpenChange(false);
        }}
      >
        {/* On a TV the teacher shell is zoomed 4/3 (tvScale.ts), which also
            scales dvh: 66dvh there is the same 88% of the screen. */}
        <div
          role={open ? "dialog" : undefined}
          aria-modal={open ? true : undefined}
          aria-label={title}
          className="flex max-h-[88dvh] w-full [@media(min-width:2200px)_and_(min-height:1200px)]:max-h-[66dvh] max-w-4xl flex-col overflow-hidden rounded-t-neo-xl border-3 border-neo-cream bg-neo-navy shadow-hard-2xl md:rounded-neo-xl"
        >
          <div className="flex shrink-0 items-center gap-3 border-b-3 border-neo-cream bg-neo-navy-light px-4 py-3">
            <h2 className="min-w-0 flex-1 truncate font-neo-display text-lg font-black uppercase tracking-tight text-neo-white">
              {title}
            </h2>
            <button
              type="button"
              data-testid={`${testId}-close`}
              onClick={() => onOpenChange(false)}
              aria-label={closeLabel}
              className="flex size-10 shrink-0 items-center justify-center rounded-neo border-3 border-neo-cream bg-neo-navy text-neo-white shadow-hard-sm focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
            >
              <X className="size-5" strokeWidth={3} aria-hidden="true" />
            </button>
          </div>
          <div
            className={cn(
              "min-h-0 flex-1 space-y-6 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
              open && "overflow-y-auto overscroll-contain",
            )}
          >
            {mountWhenOpen && !open ? null : children}
          </div>
        </div>
      </div>
    </details>
  );
}

export default HqSheet;
