import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { RankState } from "@/lib/wordTowerV2/rush/types";
import { RankMeter } from "../RankMeter";

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(",")}` : key;

const rank = (over: Partial<RankState> = {}): RankState => ({
  tier: 2,
  tierId: "lowrise",
  progress01: 0.42,
  nextTierM: 60,
  ...over,
});

describe("RankMeter", () => {
  it("given a rank, when rendered, then the tier name and progress are shown", () => {
    render(<RankMeter t={t} rank={rank()} reducedMotion />);
    expect(screen.getByText("wordTowerV2.rush.rank.lowrise")).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("42");
  });

  it("given the top tier, when rendered, then the bar is full and reads max", () => {
    render(
      <RankMeter
        t={t}
        rank={rank({
          tier: 8,
          tierId: "legend",
          progress01: 0.3,
          nextTierM: null,
        })}
        reducedMotion
      />,
    );
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "100",
    );
    expect(screen.getByText("wordTowerV2.rush.rank.max")).toBeTruthy();
  });

  it("given a tier rise, when re-rendered, then the meter pulses", () => {
    const { rerender, container } = render(
      <RankMeter t={t} rank={rank()} reducedMotion />,
    );
    expect(container.querySelector('[data-rank-pulse="true"]')).toBeNull();
    rerender(
      <RankMeter
        t={t}
        rank={rank({ tier: 3, tierId: "midrise", progress01: 0 })}
        reducedMotion
      />,
    );
    expect(container.querySelector('[data-rank-pulse="true"]')).toBeTruthy();
  });

  it("given progress outside 0..1, when rendered, then the bar is clamped", () => {
    render(<RankMeter t={t} rank={rank({ progress01: 1.7 })} reducedMotion />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "100",
    );
  });
});
