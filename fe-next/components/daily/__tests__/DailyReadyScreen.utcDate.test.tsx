/**
 * DailyReadyScreen date label must follow the UTC daily calendar.
 * Regression: without timeZone: "UTC", Americas evenings formatted
 * midnight-UTC puzzleDate as the previous local day while the hub ISO
 * still showed today.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import DailyReadyScreen from "../DailyReadyScreen";

vi.mock("@/contexts/MusicContext", () => ({
  useMusic: () => ({
    preloadMusicTrack: vi.fn(),
    TRACKS: { BOSSA_ARCADE: "bossaArcade", IN_GAME: "inGame" },
    currentTrack: null, volume: 0.5, isMuted: false, isPlaying: false,
    audioUnlocked: false, playTrack: vi.fn(), stopMusic: vi.fn(),
    fadeToTrack: vi.fn(), setVolume: vi.fn(), toggleMute: vi.fn(), unlockAudio: vi.fn(),
  }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key, language: "en" }),
}));
vi.mock("@/components/CrazyGamesSDK", () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }),
}));

describe("DailyReadyScreen UTC date label", () => {
  const defaultProps = {
    puzzleNumber: 944,
    puzzleDate: "2026-08-31",
    language: "en" as const,
    currentFlag: "🇺🇸",
    challengeData: null,
    isAuthenticated: false,
    targetWordLength: 5,
    currentPlayerId: null,
    guestFingerprint: null,
    onLanguageChange: vi.fn(),
    onStart: vi.fn(),
    onBack: vi.fn(),
    onShowTutorial: vi.fn(),
    t: (key: string) => key,
  };

  it("formats the puzzle date in UTC (not the browser local calendar)", () => {
    // Simulate a US Pacific evening where local calendar is still Aug 30
    // while the UTC puzzle day is already Aug 31.
    const realResolved = Intl.DateTimeFormat.prototype.resolvedOptions;
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...realResolved.call(this), timeZone: "America/Los_Angeles" };
    });

    render(<DailyReadyScreen {...defaultProps} />);
    // Must contain August 31, never August 30.
    expect(screen.getByText(/August 31/i)).toBeInTheDocument();
    expect(screen.queryByText(/August 30/i)).not.toBeInTheDocument();
  });
});
