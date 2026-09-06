/**
 * Depth blocks for the older education landing pages.
 *
 * The pages these render on lose their SERPs to 3,000-word teacher-blog
 * listicles. What they can offer that a listicle cannot is the mechanism: what
 * the product actually does, stated in numbers that come from constants in this
 * repo rather than from marketing. So each block is a question a teacher would
 * type, an answer short enough to be quoted whole, and a handful of specifics.
 *
 * The `data-answer` attribute is the same hook `buildEducationLandingJsonLd`
 * marks `speakable` on the newer pages: it gives an AI answer engine one
 * self-contained passage to lift instead of stitching one out of hero copy.
 * Answers are deliberately 40-60 words — long enough to stand alone, short
 * enough to survive being quoted.
 */

export type DepthSection = {
  /** Renders as an H2 — a question a teacher would actually search. */
  heading: string;
  /** Self-contained 40-60 word answer. Marked `data-answer` for speakable. */
  answer: string;
  /** Concrete specifics. Every one of these must be checkable in the codebase. */
  points: string[];
};

export function EducationDepthSections({ sections }: { sections: readonly DepthSection[] }) {
  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => (
        <section key={section.heading} className="mt-20">
          <h2 className="mb-4 font-neo-display text-3xl font-black uppercase sm:text-4xl">
            {section.heading}
          </h2>
          <p
            data-answer
            className="max-w-3xl rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 text-base leading-relaxed text-neo-gray-100 shadow-hard sm:text-lg"
          >
            {section.answer}
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {section.points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-neo border-2 border-neo-black bg-neo-navy-light p-4 text-sm text-neo-gray-200 shadow-hard-sm sm:text-base"
              >
                <span aria-hidden="true" className="text-neo-lime">
                  ▸
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
