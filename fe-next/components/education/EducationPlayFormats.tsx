import { playFormats, LIVE_MODE_COUNT, PRACTICE_FORMAT_COUNT } from '@/lib/education/playFormats';

/**
 * "One word list, N ways to play it."
 *
 * The named-format table these pages were missing. Competitors win this query with
 * listicles naming twenty activities; the honest answer here is that one uploaded
 * list drives every format the product has, and the formats have names.
 *
 * Nothing in the table is written by marketing: rows come from
 * `lib/education/playFormats.ts`, which reads the three registries and pulls each
 * name and description from the shipped UI strings. When a mode ships, this section
 * grows by itself — which is the failure it exists to prevent, since the live vocab
 * quiz went live while the copy still said four classroom modes.
 *
 * The heading counts live, so no page may print a stale total.
 */
export function EducationPlayFormats({
  locale,
  heading,
  intro,
  liveLabel,
  practiceLabel,
}: {
  locale: string;
  /** Receives the derived count — write it with a `{count}` placeholder. */
  heading: string;
  /** 40-60 word quotable answer. Marked `data-answer` for AI answer engines. */
  intro: string;
  liveLabel: string;
  practiceLabel: string;
}) {
  const { live, practice } = playFormats(locale);
  const total = live.length + practice.length;

  const group = (label: string, rows: typeof live, accent: string) => (
    <div className="mt-8">
      <h3 className="mb-3 font-neo-display text-lg font-black uppercase tracking-wide text-neo-white">
        {label}
      </h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map((f) => (
          <li
            key={f.id}
            className="rounded-neo border-2 border-neo-black bg-neo-navy-light p-4 shadow-hard-sm"
          >
            <span className={`font-neo-display text-sm font-black uppercase ${accent}`}>
              {f.name}
            </span>
            <p className="mt-1 text-sm text-neo-gray-200">{f.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section className="mt-20">
      <h2 className="mb-4 font-neo-display text-3xl font-black uppercase sm:text-4xl">
        {heading.replace('{count}', String(total))}
      </h2>
      <p
        data-answer
        className="max-w-3xl rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 text-base leading-relaxed text-neo-gray-100 shadow-hard sm:text-lg"
      >
        {intro
          .replace('{count}', String(total))
          .replace('{live}', String(LIVE_MODE_COUNT))
          .replace('{practice}', String(PRACTICE_FORMAT_COUNT))}
      </p>
      {group(liveLabel.replace('{live}', String(LIVE_MODE_COUNT)), live, 'text-neo-lime')}
      {group(
        practiceLabel.replace('{practice}', String(PRACTICE_FORMAT_COUNT)),
        practice,
        'text-neo-cyan',
      )}
    </section>
  );
}
