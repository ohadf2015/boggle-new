import type { EducationFaqItem } from '@/app/[locale]/education/seoContent';

export function LandingFaq({ title, items }: { title: string; items: EducationFaqItem[] }) {
  return (
    <section id="faq" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <h2 className="font-neo-display text-2xl font-black text-neo-white sm:text-3xl">{title}</h2>
      <div className="mt-5 max-w-3xl divide-y-2 divide-neo-navy/15 overflow-hidden rounded-neo border-3 border-neo-black bg-neo-cream shadow-hard">
        {items.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-start font-bold text-neo-navy hover:bg-neo-white/60 [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span aria-hidden className="shrink-0 text-xl font-black transition-transform duration-150 group-open:rotate-45 motion-reduce:transition-none">
                +
              </span>
            </summary>
            <p className="px-4 pb-4 text-sm leading-relaxed text-neo-navy/80">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default LandingFaq;
