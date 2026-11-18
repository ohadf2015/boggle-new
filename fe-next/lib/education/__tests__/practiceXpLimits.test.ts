import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/utils/logger", () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import logger from "@/utils/logger";
import {
  PRACTICE_DAILY_XP_CAP,
  PRACTICE_XP_LIMIT_TIMEOUT_MS,
  allowedPracticeXp,
  capPracticeXpInput,
  readPracticeXpLimits,
} from "../practiceXpLimits";

type Answer = { data: unknown; error: unknown } | "hang";

function adminWith(lesson: Answer, sessions: Answer) {
  const calls: Array<[string, unknown[]]> = [];
  const client = {
    from(table: string) {
      const answer = table === "vocabulary_lessons" ? lesson : sessions;
      const settle = () => (answer === "hang" ? new Promise(() => undefined) : Promise.resolve(answer));
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "gte", "gt", "limit", "abortSignal"]) {
        builder[method] = (...args: unknown[]) => {
          calls.push([method, args]);
          return builder;
        };
      }
      builder.maybeSingle = settle;
      builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => settle().then(resolve, reject);
      return builder;
    },
  };
  return { client: client as never, calls };
}

const read = (getAdmin: () => never) =>
  readPracticeXpLimits(getAdmin, { studentId: "s1", lessonId: "l1", nowMs: Date.parse("2026-11-18T12:00:00Z") });

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("capPracticeXpInput", () => {
  it("GIVEN counts above a 10 word deck WHEN capped THEN every client count stops at the deck", () => {
    expect(capPracticeXpInput({
      cardsReviewed: 9999,
      cardsCorrect: 9999,
      pairsMatched: 500,
      totalPairs: 500,
      wordsSpelled: 500,
      spellingStreak: 500,
      blitzWordsFound: 500,
      blitzMaxCombo: 500,
      vocabularyWordsFound: Array.from({ length: 40 }, (_, i) => `w${i}`),
    }, 10)).toMatchObject({
      cardsReviewed: 10,
      cardsCorrect: 10,
      pairsMatched: 10,
      totalPairs: 10,
      wordsSpelled: 10,
      spellingStreak: 10,
      vocabularyWordsFound: expect.objectContaining({ length: 10 }),
    });
  });

  it("GIVEN an honest round inside the deck WHEN capped THEN its counts do not change", () => {
    const round = { cardsReviewed: 8, cardsCorrect: 6, vocabularyWordsFound: ["a", "b"] };
    expect(capPracticeXpInput(round, 10)).toEqual(round);
  });

  it("GIVEN Blitz, which reshuffles the deck WHEN capped THEN its own session cap still governs words found", () => {
    expect(capPracticeXpInput({ blitzWordsFound: 57, blitzMaxCombo: 12 }, 10)).toEqual({ blitzWordsFound: 57, blitzMaxCombo: 12 });
  });
});

describe("allowedPracticeXp", () => {
  it("GIVEN room under the daily cap WHEN awarded THEN the session keeps its XP", () => {
    expect(allowedPracticeXp(200, PRACTICE_DAILY_XP_CAP - 200)).toBe(200);
  });

  it("GIVEN a session that would cross the cap WHEN awarded THEN it earns 0", () => {
    expect(allowedPracticeXp(201, PRACTICE_DAILY_XP_CAP - 200)).toBe(0);
  });

  it("GIVEN the cap WHEN compared with the heaviest real day of 480 XP THEN it is far above it", () => {
    expect(PRACTICE_DAILY_XP_CAP).toBeGreaterThanOrEqual(480 * 20);
  });
});

describe("readPracticeXpLimits", () => {
  it("GIVEN a lesson and earlier sessions WHEN read THEN it returns the deck and the XP of the last 24 hours", async () => {
    const { client, calls } = adminWith(
      { data: { words: [{ word: "a" }, "b", "c"] }, error: null },
      { data: [{ xp_awarded: 100 }, { xp_awarded: 60 }], error: null },
    );
    await expect(read(() => client)).resolves.toEqual({ deckSize: 3, xpLast24h: 160 });
    expect(calls).toContainEqual(["gte", ["completed_at", "2026-11-17T12:00:00.000Z"]]);
    expect(calls).toContainEqual(["gt", ["xp_awarded", 0]]);
  });

  it.each([
    ["the lesson read errors", { data: null, error: { message: "down" } }, { data: [], error: null }],
    ["the lesson is missing", { data: null, error: null }, { data: [], error: null }],
    ["the session read errors", { data: { words: [] }, error: null }, { data: null, error: { message: "down" } }],
  ])("GIVEN %s WHEN read THEN limits are unknown and it is logged", async (_name, lesson, sessions) => {
    const { client } = adminWith(lesson, sessions);
    await expect(read(() => client)).resolves.toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });

  it("GIVEN no service client WHEN read THEN limits are unknown instead of throwing", async () => {
    await expect(read(() => { throw new Error("no key"); })).resolves.toBeNull();
    await expect(read(() => null as never)).resolves.toBeNull();
  });

  it("GIVEN a read that hangs WHEN the time cap passes THEN limits are unknown", async () => {
    vi.useFakeTimers();
    const { client } = adminWith({ data: { words: [] }, error: null }, "hang");
    const pending = read(() => client);
    await vi.advanceTimersByTimeAsync(PRACTICE_XP_LIMIT_TIMEOUT_MS);
    await expect(pending).resolves.toBeNull();
  });
});
