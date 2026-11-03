import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { Perk } from "@/lib/wordTowerV2/rush/types";
import { PerkDraft } from "../PerkDraft";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(",")}` : key;

const PERKS: Perk[] = [
  { id: "wideLoad", rarity: "common", glyph: "wide", mods: { widthMul: 1.15 } },
  { id: "goldRush", rarity: "rare", glyph: "gold", mods: { goldChanceMul: 2 } },
  {
    id: "momentum",
    rarity: "epic",
    glyph: "momentum",
    mods: { comboGainMul: 1.5 },
  },
];

const renderDraft = (onPick = vi.fn()) => {
  render(
    <PerkDraft t={t} perks={PERKS} onPick={onPick} floor={10} reducedMotion />,
  );
  return onPick;
};

describe("PerkDraft", () => {
  it("given three perks, when shown, then a labelled dialog offers three cards with name and description", () => {
    renderDraft();
    const dialog = screen.getByRole("dialog");
    const titleId = dialog.getAttribute("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId as string)?.textContent).toContain(
      "wordTowerV2.rush.draft.title",
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(
      screen.getByText("wordTowerV2.rush.perk.goldRush.name"),
    ).toBeTruthy();
    expect(
      screen.getByText("wordTowerV2.rush.perk.momentum.desc"),
    ).toBeTruthy();
    expect(screen.getByText("wordTowerV2.rush.draft.subtitle:10")).toBeTruthy();
  });

  it("given a landscape phone, when cards render, then their glyphs opt out of the global 18px button-svg clamp", () => {
    renderDraft();
    for (const card of screen.getAllByRole("button")) {
      expect(card.classList.contains("svg-free")).toBe(true);
    }
  });

  it("given the draft opens, when mounted, then the first card has focus", () => {
    renderDraft();
    expect(document.activeElement).toBe(screen.getAllByRole("button")[0]);
  });

  it("given a card, when clicked, then onPick gets that perk id once", () => {
    const onPick = renderDraft();
    fireEvent.click(screen.getAllByRole("button")[1]);
    fireEvent.click(screen.getAllByRole("button")[2]);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith("goldRush");
  });

  it.each([
    ["1", "wideLoad"],
    ["2", "goldRush"],
    ["3", "momentum"],
  ])(
    "given the draft, when key %s is pressed, then onPick gets %s",
    (key, id) => {
      const onPick = renderDraft();
      fireEvent.keyDown(window, { key });
      expect(onPick).toHaveBeenCalledWith(id);
    },
  );

  it("given a pick in full motion, when the picked card has had its beat, then onPick fires", () => {
    vi.useFakeTimers();
    const onPick = vi.fn();
    render(<PerkDraft t={t} perks={PERKS} onPick={onPick} floor={5} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onPick).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(600));
    expect(onPick).toHaveBeenCalledWith("wideLoad");
  });

  it("given focus on the last card, when Tab is pressed, then focus wraps to the first card", () => {
    renderDraft();
    const cards = screen.getAllByRole("button");
    cards[2].focus();
    fireEvent.keyDown(cards[2], { key: "Tab" });
    expect(document.activeElement).toBe(cards[0]);
  });
});
