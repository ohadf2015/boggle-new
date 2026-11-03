import { describe, expect, it } from "vitest";
import { layoutRivalLabels } from "../GhostRivalsLayer";

const sortedGaps = (ys: number[]) => {
  const s = [...ys].sort((a, b) => a - b);
  return s.slice(1).map((y, i) => y - s[i]);
};

describe("layoutRivalLabels", () => {
  it("given labels already far apart, when laid out, then they keep their own y", () => {
    expect(layoutRivalLabels([50, 200, 400], 24, 600)).toEqual([50, 200, 400]);
  });

  it("given two labels closer than the gap, when laid out, then the lower one is pushed down to the gap", () => {
    expect(layoutRivalLabels([100, 110], 24, 600)).toEqual([100, 124]);
  });

  it("given labels in any input order, when laid out, then each output keeps its input index", () => {
    const out = layoutRivalLabels([110, 100], 24, 600);
    expect(out).toEqual([124, 100]);
  });

  it("given a label above the top or below max, when laid out, then it is clamped inside [0, max]", () => {
    expect(layoutRivalLabels([-80, 900], 24, 600)).toEqual([0, 600]);
  });

  it("given a cluster pressed against max, when laid out, then it stacks upward without crossing max", () => {
    const out = layoutRivalLabels([590, 595, 600], 24, 600);
    expect(Math.max(...out)).toBeLessThanOrEqual(600);
    expect(Math.min(...sortedGaps(out))).toBeGreaterThanOrEqual(24);
    expect(out).toEqual([552, 576, 600]);
  });

  it("given more labels than fit, when laid out, then they spread evenly across [0, max] and stay ordered", () => {
    const out = layoutRivalLabels([10, 11, 12, 13, 14], 24, 40);
    expect(out).toEqual([0, 10, 20, 30, 40]);
  });

  it("given nothing, when laid out, then nothing comes back", () => {
    expect(layoutRivalLabels([], 24, 600)).toEqual([]);
  });
});
