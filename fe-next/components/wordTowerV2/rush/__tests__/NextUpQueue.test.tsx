import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { NextUpSlot } from "@/lib/wordTowerV2/rush/types";
import { NextUpQueue, detectReveals } from "../NextUpQueue";

afterEach(cleanup);

const t = (key: string) => key;

const SLOTS: NextUpSlot[] = [
  { trait: "gold", sealed: false },
  { trait: "plain", sealed: false },
  { trait: "anvil", sealed: true },
];

describe("NextUpQueue", () => {
  it("given three slots, when rendered, then three chips sit in a labelled list", () => {
    render(<NextUpQueue t={t} slots={SLOTS} reducedMotion />);
    expect(
      screen.getByRole("list", { name: "wordTowerV2.rush.nextUp.label" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("given open slots, when rendered, then each is named by its trait", () => {
    render(<NextUpQueue t={t} slots={SLOTS} reducedMotion />);
    expect(screen.getByLabelText("wordTowerV2.rush.trait.gold")).toBeTruthy();
    expect(screen.getByLabelText("wordTowerV2.rush.trait.plain")).toBeTruthy();
  });

  it('given a sealed slot, when rendered, then it hides its trait behind a "?"', () => {
    render(<NextUpQueue t={t} slots={SLOTS} reducedMotion />);
    const sealed = screen.getByLabelText("wordTowerV2.rush.nextUp.sealed");
    expect(sealed.getAttribute("data-sealed")).toBe("true");
    expect(sealed.textContent).toContain("?");
    expect(screen.queryByLabelText("wordTowerV2.rush.trait.anvil")).toBeNull();
  });

  it("given a sealed slot, when it unseals, then it reveals its trait with a flip", () => {
    const { rerender } = render(
      <NextUpQueue t={t} slots={SLOTS} reducedMotion />,
    );
    rerender(
      <NextUpQueue
        t={t}
        slots={[SLOTS[0], SLOTS[1], { trait: "anvil", sealed: false }]}
        reducedMotion
      />,
    );
    const revealed = screen.getByLabelText("wordTowerV2.rush.trait.anvil");
    expect(revealed.getAttribute("data-revealing")).toBe("true");
  });
});

describe("detectReveals", () => {
  const open = (trait: NextUpSlot["trait"]): NextUpSlot => ({
    trait,
    sealed: false,
  });
  const hid = (trait: NextUpSlot["trait"]): NextUpSlot => ({
    trait,
    sealed: true,
  });

  it("given the sealed slot unseals in place, when compared, then only that slot reveals", () => {
    expect(
      detectReveals(
        [open("gold"), open("plain"), hid("anvil")],
        [open("gold"), open("plain"), open("anvil")],
      ),
    ).toEqual([false, false, true]);
  });

  it("given a take shifts the hidden block forward unsealed, when compared, then it reveals in its new slot", () => {
    expect(
      detectReveals(
        [open("gold"), open("plain"), hid("anvil")],
        [open("plain"), open("anvil"), hid("lucky")],
      ),
    ).toEqual([false, true, false]);
  });

  it("given a take after the block was already revealed, when compared, then nothing flips again", () => {
    expect(
      detectReveals(
        [open("gold"), open("plain"), open("anvil")],
        [open("plain"), open("anvil"), hid("lucky")],
      ),
    ).toEqual([false, false, false]);
  });

  it("given identical slots, when compared, then nothing reveals", () => {
    const same = [open("gold"), open("plain"), hid("anvil")];
    expect(
      detectReveals(
        same,
        same.map((s) => ({ ...s })),
      ),
    ).toEqual([false, false, false]);
  });
});

describe("NextUpQueue shift reveal", () => {
  it("given a take moves the hidden block forward, when rerendered, then it flips into view", () => {
    const { rerender } = render(
      <NextUpQueue t={t} slots={SLOTS} reducedMotion />,
    );
    rerender(
      <NextUpQueue
        t={t}
        slots={[
          { trait: "plain", sealed: false },
          { trait: "anvil", sealed: false },
          { trait: "lucky", sealed: true },
        ]}
        reducedMotion
      />,
    );
    expect(
      screen
        .getByLabelText("wordTowerV2.rush.trait.anvil")
        .getAttribute("data-revealing"),
    ).toBe("true");
  });
});
