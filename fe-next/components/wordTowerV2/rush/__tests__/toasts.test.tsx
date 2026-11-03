import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { OvertakeToast } from "../OvertakeToast";
import { RankUpBurst } from "../RankUpBurst";
import { GhostRivalsLayer } from "../GhostRivalsLayer";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(",")}` : key;

describe("OvertakeToast", () => {
  it("given an overtake, when shown, then it names the rival in a live region", () => {
    render(<OvertakeToast t={t} name="Dana" onDone={() => {}} reducedMotion />);
    expect(screen.getByRole("status").textContent).toContain(
      "wordTowerV2.rush.overtake.passed:Dana",
    );
  });

  it("given a very long rival name, when shown, then the name is cut to 16 characters with an ellipsis", () => {
    render(
      <OvertakeToast t={t} name="Supercalifragilistic_Builder" onDone={() => {}} reducedMotion />,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "wordTowerV2.rush.overtake.passed:Supercalifragil…",
    );
  });

  it("given a name made of emoji, when cut, then no surrogate pair is split", () => {
    render(<OvertakeToast t={t} name={"🦄".repeat(20)} onDone={() => {}} reducedMotion />);
    expect(screen.getByRole("status").textContent).toContain(`:${"🦄".repeat(15)}…`);
  });

  it("given an overtake, when ~1.8s pass, then it asks to be cleared exactly once", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<OvertakeToast t={t} name="Dana" onDone={onDone} reducedMotion />);
    act(() => vi.advanceTimersByTime(1700));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(onDone).toHaveBeenCalledOnce();
  });
});

describe("RankUpBurst", () => {
  it("given a new tier, when shown, then the tier name is announced", () => {
    render(
      <RankUpBurst t={t} tierId="highrise" onDone={() => {}} reducedMotion />,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "wordTowerV2.rush.rank.highrise",
    );
    expect(screen.getByRole("status").textContent).toContain(
      "wordTowerV2.rush.rankUp.title",
    );
  });

  it("given a new tier, when ~2.2s pass, then it asks to be cleared exactly once", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(
      <RankUpBurst t={t} tierId="highrise" onDone={onDone} reducedMotion />,
    );
    act(() => vi.advanceTimersByTime(2100));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(onDone).toHaveBeenCalledOnce();
  });
});

describe("GhostRivalsLayer", () => {
  it("given rivals, when drawn, then every rival gets a tag and the layer never takes taps", () => {
    const { container } = render(
      <GhostRivalsLayer
        t={t}
        rivals={[
          { id: "a", name: "Ana", peakM: 40 },
          { id: "b", name: "Ben", peakM: 41 },
        ]}
        heightToY={(m) => 600 - m * 10}
        viewportHeight={640}
      />,
    );
    const layer = container.firstElementChild as HTMLElement;
    expect(layer.className).toContain("pointer-events-none");
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("Ben")).toBeTruthy();
  });

  it("given two rivals 10px apart, when drawn, then their tags sit at least 24px apart", () => {
    render(
      <GhostRivalsLayer
        t={t}
        rivals={[
          { id: "a", name: "Ana", peakM: 40 },
          { id: "b", name: "Ben", peakM: 41 },
        ]}
        heightToY={(m) => 600 - m * 10}
        viewportHeight={640}
      />,
    );
    const top = (name: string) =>
      parseFloat(
        (screen.getByText(name).closest("[data-rival-tag]") as HTMLElement)
          .style.top,
      );
    expect(Math.abs(top("Ana") - top("Ben"))).toBeGreaterThanOrEqual(24);
  });
});
