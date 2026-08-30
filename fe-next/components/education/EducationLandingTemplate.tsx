import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { TeacherAccessCTA } from '@/components/education/TeacherAccessCTA';
import { DistrictUpsellStrip } from '@/components/education/DistrictUpsellStrip';
import { ACCENT, EducationSectionRenderer } from '@/components/education/EducationLandingSections';
import {
  buildEducationLandingJsonLd,
  type EducationLandingContent,
} from '@/lib/seo/educationLanding';

interface Props {
  locale: string;
  /** Locale-less route, e.g. `/education/brain-breaks-word-games`. */
  path: string;
  content: EducationLandingContent;
}

/**
 * Server component on purpose: the whole landing body ships as HTML with no
 * client bundle. That keeps the answer block and FAQ in the initial payload
 * where crawlers and AI answer engines can read them, and it sidesteps the
 * lazy-mount opacity flash documented in `.claude/rules/60-recurring-pitfalls.md`
 * (Class 5) — nothing here starts at `opacity-0`.
 */
export function EducationLandingTemplate({ locale, path, content }: Props) {
  const a = ACCENT[content.accent];
  const jsonLd = buildEducationLandingJsonLd({ locale, path, content });
  const { hero, answer } = content;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      {jsonLd.map((node) => (
        <JsonLd key={node['@id']} data={node} />
      ))}

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <TopBackLink className="mb-6" />

        <header className="max-w-4xl">
          <h1 className="font-neo-display text-[clamp(2.5rem,9vw,5.5rem)] font-black leading-[0.92] tracking-[-0.03em]">
            {hero.h1.part1}{' '}
            {/* No entrance animation on the H1: it is the LCP element, and
                `neo-pop` starts at opacity 0 — the mobile-web flash pattern in
                .claude/rules/60-recurring-pitfalls.md (Class 5). The rotate and
                hard shadow carry the energy without ever painting blank. */}
            <span className={`inline-block -rotate-2 ${a.fill} ${a.ink} px-3 shadow-hard-lg`}>
              {hero.h1.highlight}
            </span>
            <br />
            <span className={a.text}>{hero.h1.part2}</span>
          </h1>

          <p className="mt-7 max-w-[62ch] text-lg leading-relaxed text-neo-white/80 sm:text-xl">
            {hero.subtitle}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href={`/${locale}${hero.primaryCta.href}`}
              className={`rounded-neo border-4 border-neo-black ${a.fill} ${a.ink} px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider shadow-hard-lg transition-transform duration-150 ease-out hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-white`}
            >
              <span className="block text-base sm:text-lg">{hero.primaryCta.label}</span>
              {hero.primaryCta.sublabel && (
                <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">
                  {hero.primaryCta.sublabel}
                </span>
              )}
            </Link>

            {hero.secondaryCta && (
              <Link
                href={`/${locale}${hero.secondaryCta.href}`}
                className="rounded-neo border-4 border-neo-black bg-neo-navy-light px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-white"
              >
                <span className="block text-base sm:text-lg">{hero.secondaryCta.label}</span>
                {hero.secondaryCta.sublabel && (
                  <span className="block text-[10px] font-bold uppercase tracking-widest opacity-70">
                    {hero.secondaryCta.sublabel}
                  </span>
                )}
              </Link>
            )}
          </div>

          {hero.facts.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-widest text-neo-white/60">
              {hero.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </header>

        {/*
          Answer-first block. Self-contained enough that an AI answer engine can
          lift it whole; `data-answer` is the selector named by the page's
          SpeakableSpecification.
        */}
        <section
          data-answer
          className={`mt-16 rounded-neo border-4 border-neo-black bg-neo-navy-light p-6 shadow-hard-lg sm:p-8`}
        >
          <h2 className="font-neo-display text-xl font-black leading-tight sm:text-2xl">
            {answer.question}
          </h2>
          <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-neo-white/85 sm:text-lg">
            {answer.answer}
          </p>
        </section>

        {content.sections.map((section, i) => (
          <EducationSectionRenderer key={`${section.kind}-${i}`} section={section} accent={content.accent} />
        ))}

        {content.faqs.length > 0 && (
          <section className="mt-20 sm:mt-24">
            <h2 className="font-neo-display text-3xl font-black uppercase leading-[1.05] sm:text-4xl">
              {content.labels.faqTitle}
            </h2>
            <div className="mt-8 space-y-3">
              {content.faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard open:shadow-hard-lg"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-neo-display font-black uppercase tracking-wide sm:px-6">
                    <span>{faq.q}</span>
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded border-2 border-neo-black ${a.fill} ${a.ink} transition-transform duration-150 group-open:rotate-45`}
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <div className="border-t-3 border-neo-black px-5 py-4 text-sm leading-relaxed text-neo-white/75 sm:px-6 sm:text-base">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {content.related.length > 0 && (
          <nav className="mt-16 flex flex-wrap gap-3 text-sm font-bold" aria-label={content.labels.relatedTitle}>
            {content.related.map((r) => (
              <Link
                key={r.href}
                href={`/${locale}${r.href}`}
                className={`rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-2 ${ACCENT[r.accent].text} transition-colors hover:bg-neo-navy`}
              >
                {r.label}
              </Link>
            ))}
          </nav>
        )}

        <TeacherAccessCTA />
        <DistrictUpsellStrip hideTeacherCta />
      </div>
    </main>
  );
}
