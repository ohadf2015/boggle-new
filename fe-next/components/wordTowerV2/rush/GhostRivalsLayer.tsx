"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { GhostRival } from "@/lib/wordTowerV2/rush/types";

type T = (key: string, params?: Record<string, string | number>) => string;

const LABEL_H = 24;
const MIN_GAP = 24;

export function layoutRivalLabels(
  ys: number[],
  minGap: number,
  max: number,
): number[] {
  const n = ys.length;
  if (n === 0) return [];
  const order = ys
    .map((y, i) => ({ y: Math.min(max, Math.max(0, y)), i }))
    .sort((a, b) => a.y - b.y);
  const out = new Array<number>(n);

  if ((n - 1) * minGap > max) {
    order.forEach(({ i }, k) => {
      out[i] = n === 1 ? 0 : (k * max) / (n - 1);
    });
    return out;
  }

  const placed = order.map((o) => o.y);
  for (let k = 1; k < n; k++)
    placed[k] = Math.max(placed[k], placed[k - 1] + minGap);
  if (placed[n - 1] > max) {
    placed[n - 1] = max;
    for (let k = n - 2; k >= 0; k--)
      placed[k] = Math.min(placed[k], placed[k + 1] - minGap);
  }
  order.forEach(({ i }, k) => {
    out[i] = placed[k];
  });
  return out;
}

interface Insets {
  top: number;
  bottom: number;
}

function useSafeAreaInsets(): [
  React.RefObject<HTMLSpanElement | null>,
  Insets,
] {
  const probe = useRef<HTMLSpanElement | null>(null);
  const [insets, setInsets] = useState<Insets>({ top: 0, bottom: 0 });
  useLayoutEffect(() => {
    const el = probe.current;
    if (!el || typeof window === "undefined") return;
    const cs = window.getComputedStyle(el);
    const top = parseFloat(cs.paddingTop) || 0;
    const bottom = parseFloat(cs.paddingBottom) || 0;
    setInsets((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom },
    );
  }, []);
  return [probe, insets];
}

interface Props {
  t: T;
  rivals: GhostRival[];
  heightToY: (m: number) => number;
  viewportHeight: number;
}

export function GhostRivalsLayer({
  t,
  rivals,
  heightToY,
  viewportHeight,
}: Props) {
  const [probe, insets] = useSafeAreaInsets();

  const rows = useMemo(() => {
    const top = insets.top + 4;
    const span = Math.max(
      0,
      viewportHeight - insets.bottom - 4 - LABEL_H - top,
    );
    const lines = rivals.map((r) => heightToY(r.peakM));
    const tags = layoutRivalLabels(
      lines.map((y) => y - LABEL_H / 2 - top),
      MIN_GAP,
      span,
    ).map((y) => y + top);
    return rivals.map((r, i) => ({ rival: r, lineY: lines[i], tagY: tags[i] }));
  }, [rivals, heightToY, viewportHeight, insets]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden>
      <span
        ref={probe}
        className="invisible absolute"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), var(--cap-safe-area-bottom, 0px))",
        }}
      />
      {rows.map(({ rival, lineY, tagY }) => {
        const onScreen = lineY >= 0 && lineY <= viewportHeight;
        return (
          <div key={rival.id}>
            {onScreen ? (
              <div
                className="absolute inset-x-0 border-t border-dashed border-neo-cream/35"
                style={{ top: lineY }}
              />
            ) : null}
            {/* A rival whose height is off screen is a direction, not a name:
                a small arrow chip at the edge, so it never sits over the sky
                like a second headline. */}
            <div
              data-rival-tag
              data-offscreen={onScreen ? undefined : "true"}
              // Calm on purpose: one quiet chip, no hard border or shadow, so
              // it marks a height without competing with the tower.
              className={`absolute end-2 flex max-w-[55%] items-center gap-1 rounded-full border border-neo-cream/30 bg-neo-navy/60 px-2 font-neo-display font-bold text-neo-cream/85 ${
                onScreen ? "text-[10px] leading-[18px]" : "text-[10px] leading-[16px] opacity-60"
              }`}
              style={{ top: tagY, height: LABEL_H - 4 }}
            >
              {onScreen ? (
                <span className="min-w-0 truncate">{rival.name}</span>
              ) : (
                <span aria-hidden>{lineY < 0 ? "▲" : "▼"}</span>
              )}
              <span className="shrink-0 tabular-nums text-neo-yellow/80">
                {t("wordTowerV2.rush.rival.height", {
                  m: Math.round(rival.peakM),
                })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
