import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Howler } from "howler";
import { PRACTICE_NEEDS_BOARD_EVENT, PRACTICE_SEAT_RETRY_EVENT, PRACTICE_SEAT_TIMEOUT_MS, PRACTICE_SKIP_TO_GAME_EVENT } from "@/host/hooks/useRehearseAutoStart";
import { PracticeRunPanel } from "@/components/education/live/PracticeRunPanel";

vi.mock("howler", () => ({ Howler: { mute: vi.fn() } }));

const t = (key: string) => key;

function Panel(props: Partial<React.ComponentProps<typeof PracticeRunPanel>>) {
  return <PracticeRunPanel gameCode="AB12CD" language="he" joined started={false} ended={false} open onOpenChange={vi.fn()} onExit={vi.fn()} t={t} {...props} />;
}

describe("PracticeRunPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("given a practice run, then the real student page fills the screen as a practice seat, with no new-tab detour", () => {
    render(<Panel />);
    expect(screen.getByTestId("practice-run-frame")).toHaveAttribute("src", "/he/education/live?room=AB12CD&practiceSeat=1");
    expect(screen.getByTestId("practice-run-panel").className).toContain("inset-0");
    expect(screen.queryByTestId("practice-run-open-tab")).toBeNull();
  });

  it("given the teacher switches to the teacher view, then the student game stays loaded and one button brings it back", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Panel onOpenChange={onOpenChange} />);
    const frame = screen.getByTestId("practice-run-frame");
    fireEvent.click(screen.getByTestId("practice-run-teacher-view"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    rerender(<Panel open={false} onOpenChange={onOpenChange} />);
    expect(screen.getByTestId("practice-run-frame")).toBe(frame);
    expect(screen.getByTestId("practice-run-panel").className).toContain("hidden");
    fireEvent.click(screen.getByTestId("practice-run-show"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("given the student is in the lobby, then skip asks the room to start; before they join or once playing it is gone", () => {
    const heard = vi.fn();
    window.addEventListener(PRACTICE_SKIP_TO_GAME_EVENT, heard);
    const { rerender } = render(<Panel />);
    fireEvent.click(screen.getByTestId("practice-run-skip"));
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(PRACTICE_SKIP_TO_GAME_EVENT, heard);
    rerender(<Panel joined={false} />);
    expect(screen.queryByTestId("practice-run-skip")).toBeNull();
    rerender(<Panel started />);
    expect(screen.queryByTestId("practice-run-skip")).toBeNull();
  });

  it("given the round is over, then the way out reads as going back to the class", () => {
    const onExit = vi.fn();
    render(<Panel started ended onExit={onExit} />);
    const exit = screen.getByTestId("practice-run-exit");
    expect(exit).toHaveTextContent("eduLiveRoom.practice.backToClass");
    fireEvent.click(exit);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("given the student view is showing, then the hidden board stays silent, and its sound returns with the teacher view", () => {
    const { rerender } = render(<Panel />);
    expect(Howler.mute).toHaveBeenLastCalledWith(true);
    rerender(<Panel open={false} />);
    expect(Howler.mute).toHaveBeenLastCalledWith(false);
  });

  it("given the round cannot start, then the teacher view opens so its explanation is visible", () => {
    const onOpenChange = vi.fn();
    render(<Panel onOpenChange={onOpenChange} />);
    act(() => { window.dispatchEvent(new Event(PRACTICE_NEEDS_BOARD_EVENT)); });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  describe("when the student page never joins", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("given the timeout, then the teacher sees a retry that reloads the student page", () => {
      render(<Panel joined={false} />);
      const before = screen.getByTestId("practice-run-frame");
      expect(screen.queryByTestId("practice-run-retry")).toBeNull();
      act(() => { vi.advanceTimersByTime(PRACTICE_SEAT_TIMEOUT_MS); });
      fireEvent.click(screen.getByTestId("practice-run-retry"));
      expect(screen.getByTestId("practice-run-frame")).not.toBe(before);
      expect(screen.queryByTestId("practice-run-retry")).toBeNull();
    });

    it("given the timeout, then the teacher can reach the board and its bots-only start", () => {
      const onOpenChange = vi.fn();
      render(<Panel joined={false} onOpenChange={onOpenChange} />);
      act(() => { vi.advanceTimersByTime(PRACTICE_SEAT_TIMEOUT_MS); });
      fireEvent.click(screen.getByTestId("practice-run-timeout-teacher-view"));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("given a seat that joined late and then dropped, then the wait starts over instead of failing at once", () => {
      const { rerender } = render(<Panel joined={false} />);
      act(() => { vi.advanceTimersByTime(PRACTICE_SEAT_TIMEOUT_MS); });
      rerender(<Panel joined />);
      rerender(<Panel joined={false} />);
      expect(screen.queryByTestId("practice-run-retry")).toBeNull();
    });

    it("given the board asks for a retry, then the student page reloads", () => {
      render(<Panel joined={false} />);
      const before = screen.getByTestId("practice-run-frame");
      act(() => { window.dispatchEvent(new Event(PRACTICE_SEAT_RETRY_EVENT)); });
      expect(screen.getByTestId("practice-run-frame")).not.toBe(before);
    });
  });
});
