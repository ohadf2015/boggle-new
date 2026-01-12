import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

/**
 * StatDisplay - Non-interactive display component for statistics
 *
 * Use this component for showing data that users should NOT expect to click.
 * Visual differences from interactive elements:
 * - No hard shadow (shadow-none)
 * - Muted/dashed border
 * - No hover/focus effects
 * - cursor-default
 */
const statDisplayVariants = cva(
  // Base styles - clearly non-interactive
  [
    "inline-flex flex-col items-center justify-center",
    "rounded-lg border border-dashed",
    "px-3 py-2 text-center",
    "cursor-default select-none",
    // No shadow, no hover effects
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-slate-100/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600",
        accent: "bg-neo-cyan/10 border-neo-cyan/40",
        success: "bg-neo-lime/10 border-neo-lime/40",
        warning: "bg-neo-yellow/10 border-neo-yellow/40",
        info: "bg-neo-pink/10 border-neo-pink/40",
      },
      size: {
        sm: "px-2 py-1 gap-0.5",
        md: "px-3 py-2 gap-1",
        lg: "px-4 py-3 gap-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface StatDisplayProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statDisplayVariants> {
  /** The main value to display */
  value: string | number;
  /** Label describing what the value represents */
  label: string;
  /** Optional icon to show above the value */
  icon?: React.ReactNode;
}

/**
 * StatDisplay component for showing non-interactive statistics
 *
 * @example
 * <StatDisplay value={42} label="Words Found" />
 * <StatDisplay value="95%" label="Accuracy" variant="success" />
 */
function StatDisplay({
  className,
  variant,
  size,
  value,
  label,
  icon,
  ...props
}: StatDisplayProps) {
  return (
    <div
      className={cn(statDisplayVariants({ variant, size }), className)}
      role="status"
      aria-label={`${label}: ${value}`}
      {...props}
    >
      {icon && (
        <span className="text-slate-500 dark:text-slate-400" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
        {value}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}

/**
 * StatCard - Larger stat display with more visual weight
 * Still clearly non-interactive
 */
const statCardVariants = cva(
  [
    "flex flex-col items-center justify-center",
    "rounded-neo border-2",
    "p-3 text-center",
    "cursor-default select-none",
    "bg-white/80 dark:bg-neo-navy/80",
    // Key difference: no shadow, subtle border
  ].join(" "),
  {
    variants: {
      variant: {
        default: "border-slate-200 dark:border-slate-700",
        highlight: "border-neo-cyan/50 bg-gradient-to-b from-neo-cyan/5 to-neo-cyan/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  value: string | number;
  label: string;
  subValue?: string;
  icon?: React.ReactNode;
}

function StatCard({
  className,
  variant,
  value,
  label,
  subValue,
  icon,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(statCardVariants({ variant }), className)}
      role="status"
      aria-label={`${label}: ${value}${subValue ? ` (${subValue})` : ""}`}
      {...props}
    >
      {icon && (
        <div className="mb-1 text-slate-400 dark:text-slate-500" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
        {value}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      {subValue && (
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {subValue}
        </div>
      )}
    </div>
  );
}

export { StatDisplay, StatCard, statDisplayVariants, statCardVariants };
