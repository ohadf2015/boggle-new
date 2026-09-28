/**
 * Visible, cite-able FAQ for education/GEO pages.
 *
 * Accordion `<details>` keeps answers in the DOM but hides them from the
 * default view — answer engines quote the first visible H2/H3 + 40–60 word
 * paragraph, not a collapsed summary. This list is always expanded: question
 * as H3, answer as a paragraph, no client JS.
 */
export type GeoFaqItem = { q: string; a: string } | { question: string; answer: string };

function qa(item: GeoFaqItem): { q: string; a: string } {
  if ('q' in item) return { q: item.q, a: item.a };
  return { q: item.question, a: item.answer };
}

export function GeoFaqList({
  title,
  items,
}: {
  title: string;
  items: GeoFaqItem[];
}) {
  if (!items.length) return null;
  return (
    <section data-geo-faq className="mt-20 sm:mt-24">
      <h2 className="font-neo-display text-3xl font-black uppercase leading-[1.05] sm:text-4xl">
        {title}
      </h2>
      <div className="mt-8 space-y-4">
        {items.map((item) => {
          const { q, a } = qa(item);
          return (
            <article
              key={q}
              className="rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light p-5 shadow-hard sm:p-6"
            >
              <h3 className="font-neo-display text-lg font-black leading-snug tracking-wide sm:text-xl">
                {q}
              </h3>
              <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-neo-white/80 sm:text-base">
                {a}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
