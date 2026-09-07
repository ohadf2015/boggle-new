import * as React from 'react';

/**
 * A numbered list of classroom games a teacher can run today.
 *
 * Four rounds of critics said the same thing about `vocabulary-games-classroom` and
 * `esl-word-games`: the query ("vocabulary games for classroom", "ESL word games for
 * the classroom") is INFORMATIONAL. The reader wants a list of games with setup and
 * rules — what Sadlier and Teach-This give them — and we were answering with a
 * product pitch. Rewriting the pitch four times did not change the shape of the
 * answer, so this component is the shape change.
 *
 * The honesty rule that makes it safe to publish: `runsWith` is either a real id from
 * one of the three registries, or the literal `NO_DEVICE`. A game we cannot run is
 * allowed on the list — most of these are classic teacher games that need nothing but
 * the room — but it must say so rather than borrow the nearest product feature.
 * `__tests__/classGames.test.ts` pins that.
 */

/** A game that needs no screen at all. Not a registry id, and deliberately not one. */
export const NO_DEVICE = 'no-device' as const;

export type ClassGame = {
  /** Numbered in the rendered list; the number is positional, never written here. */
  name: string;
  /** One line: what the teacher does before the game starts. */
  setup: string;
  /** Two or three short lines: how it is played. */
  rules: string;
  /** e.g. "5-10 min" — a range a teacher can fit into a period. */
  time: string;
  /** e.g. "Whole class", "Pairs", "Groups of 4". */
  groupSize: string;
  /** The skill it drills, in the teacher's words. */
  drills: string;
  /**
   * A registry id — `CLASSROOM_GAME_MODES`, `BASE_PRACTICE_MODES` or `VOCAB_FOCUSES`
   * — or `NO_DEVICE`. Never a name invented for the copy.
   */
  runsWith: string;
  /** How LexiClash runs it, or why no device is needed. One line. */
  runsWithNote: string;
};

export type ClassGameSection = {
  heading: string;
  intro: string;
  /** Row labels, localized. */
  labels: { time: string; group: string; drills: string; setup: string; rules: string; onLexiClash: string };
  games: ClassGame[];
};

export function ClassGameList({ section }: { section: ClassGameSection }): React.JSX.Element {
  const { labels } = section;
  return (
    <section>
      <h2 className="mb-3 font-neo-display text-3xl font-black uppercase sm:text-4xl">{section.heading}</h2>
      <p className="mb-8 max-w-3xl text-sm text-neo-gray-300 sm:text-base">{section.intro}</p>
      <ol className="space-y-4">
        {section.games.map((g, i) => (
          <li
            key={g.name}
            className="relative rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 pt-7 shadow-hard sm:p-6 sm:pt-7"
          >
            <span
              className="absolute -top-3.5 start-4 grid h-8 w-8 place-items-center rounded border-2 border-neo-black bg-neo-yellow font-neo-display text-sm font-black text-neo-navy shadow-hard-sm"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <h3 className="font-neo-display text-lg font-black text-neo-yellow sm:text-xl">{g.name}</h3>

            <dl className="mt-3 space-y-2 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
              <div>
                <dt className="inline font-black uppercase tracking-wide text-neo-cyan">{labels.setup}: </dt>
                <dd className="inline">{g.setup}</dd>
              </div>
              <div>
                <dt className="inline font-black uppercase tracking-wide text-neo-cyan">{labels.rules}: </dt>
                <dd className="inline">{g.rules}</dd>
              </div>
              <div>
                <dt className="inline font-black uppercase tracking-wide text-neo-lime">{labels.onLexiClash}: </dt>
                <dd className="inline">{g.runsWithNote}</dd>
              </div>
            </dl>

            <ul className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-widest">
              <li className="rounded border-2 border-neo-black bg-neo-navy px-2 py-1 text-neo-gray-200">
                {labels.time}: {g.time}
              </li>
              <li className="rounded border-2 border-neo-black bg-neo-navy px-2 py-1 text-neo-gray-200">
                {labels.group}: {g.groupSize}
              </li>
              <li className="rounded border-2 border-neo-black bg-neo-navy px-2 py-1 text-neo-gray-200">
                {labels.drills}: {g.drills}
              </li>
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
