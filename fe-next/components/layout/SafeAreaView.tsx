'use client';

import { cn } from '@/lib/utils';

export type SafeAreaEdge = 'top' | 'bottom' | 'left' | 'right';

/** Resolved padding expression for a single device edge. */
function insetValue(edge: SafeAreaEdge, minPad: string): string {
  return `max(${minPad}, var(--cap-safe-area-${edge}, env(safe-area-inset-${edge}, 0px)))`;
}

/**
 * Build the inline padding style for a set of device edges.
 *
 * Each edge resolves to:
 *   max(<minPad>, var(--cap-safe-area-<edge>, env(safe-area-inset-<edge>, 0px)))
 *
 * Why this exact expression:
 * - `var(--cap-safe-area-*)` is the SANITIZED inset published by useSafeArea()
 *   on native (it clamps the Android-15 WindowInsets double-count bug). Preferring
 *   it keeps web + native on one source of truth.
 * - `env(safe-area-inset-*)` is the fallback for web / before the hook resolves
 *   (requires viewportFit:'cover', set in app/[locale]/layout.tsx).
 * - `max(minPad, …)` guarantees a minimum gutter even when the inset is 0 (most
 *   non-notched devices and all of web).
 *
 * Exported separately so the logic is unit-testable without fighting jsdom's
 * CSS value parser (which silently drops env()/max()).
 */
export function buildSafeAreaStyle(
  edges: SafeAreaEdge[],
  minPad = '0px'
): React.CSSProperties {
  const style: React.CSSProperties = {};
  // Explicit per-edge assignment (not dynamic indexing) keeps each property
  // strongly typed against React.CSSProperties.
  if (edges.includes('top')) style.paddingTop = insetValue('top', minPad);
  if (edges.includes('bottom')) style.paddingBottom = insetValue('bottom', minPad);
  if (edges.includes('left')) style.paddingLeft = insetValue('left', minPad);
  if (edges.includes('right')) style.paddingRight = insetValue('right', minPad);
  return style;
}

export interface SafeAreaViewProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Which device edges to pad. Defaults to all four. */
  edges?: SafeAreaEdge[];
  /** Minimum gutter applied even when the device inset is 0. Defaults to '0px'. */
  minPad?: string;
}

/**
 * SafeAreaView — declarative replacement for hand-written
 * `style={{ paddingTop: 'max(…, env(safe-area-inset-top))' }}` blocks.
 *
 * @example
 * <SafeAreaView edges={['top']} minPad="0.75rem" className="sticky top-0">
 *   <Header />
 * </SafeAreaView>
 */
export function SafeAreaView({
  edges = ['top', 'bottom', 'left', 'right'],
  minPad = '0px',
  className,
  style,
  children,
  ...rest
}: SafeAreaViewProps): React.JSX.Element {
  return (
    <div
      className={cn(className)}
      style={{ ...buildSafeAreaStyle(edges, minPad), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

export default SafeAreaView;
