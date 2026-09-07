import { Fragment } from 'react';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { TeacherAccessCTA } from '@/components/education/TeacherAccessCTA';
import { NoAccountCta } from '@/components/education/NoAccountCta';
import { DistrictUpsellStrip } from '@/components/education/DistrictUpsellStrip';
import { ACCENT, EducationSectionRenderer } from '@/components/education/EducationLandingSections';
import { EducationRelatedLinks } from '@/components/education/EducationRelatedLinks';
import { EducationHeroBanner } from '@/components/education/EducationHeroBanner';
import { ScrollRevealSection } from '@/components/education/ScrollRevealSection';
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
  const { hero, answer, heroBanner, footerCta, revealSections } = content;
  const showTeacherCta = content.showTeacherAccessCta ?? true;
  const showUpsell = content.showDistrictUpsell ?? true;

  const footerCtaBlock = footerCta ? (
    <section className={`mt-12 mb-12 rounded-neo border-4 border-neo-black ${a.fill} ${a.ink} p-8 shadow-hard-xl sm:p-12`}>
      <h2 className="font-neo-display text-4xl font-black leading-[0.95] sm:text-5xl">
        {footerCta.heading}
        {footerCta.highlight && (
          <>
            <br />
            <span className={`bg-neo-navy px-3 ${a.text}`}>{footerCta.highlight}</span>
          </>
        )}
      </h2>
      {footerCta.body && <p className="mt-4 max-w-xl text-base font-bold sm:text-lg">{footerCta.body}</p>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {footerCta.ctas.map((cta, i) => (
          <Link
            key={cta.href}
            href={`/${locale}${cta.href}`}
            className={`rounded-neo border-4 border-neo-black px-7 py-4 text-center font-neo-display text-base font-black uppercase tracking-wider sm:text-lg ${
              i === 0 ? `bg-neo-navy ${a.text} shadow-hard-lg` : 'bg-neo-cyan text-neo-navy shadow-hard'
            }`}
          >
            {cta.label}
          </Link>
        ))}
      </div>
    </section>
  ) : null;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      {jsonLd.map((node) => (
        <JsonLd key={node['@id']} data={node} />
      ))}

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <TopBackLink className="mb-6" />

        {heroBanner && (
          <EducationHeroBanner title={heroBanner.title} subtitle={heroBanner.subtitle} />
        )}

        <header className={heroBanner ? 'mt-12 max-w-4xl' : 'max-w-4xl'}>
          {hero.tag && (
            <span className="mb-5 inline-block rotate-[-3deg] rounded-neo border-3 border-neo-black bg-neo-purple px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest text-neo-white shadow-hard">
              {hero.tag}
            </span>
          )}
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

          {/* The no-account path, once, above the fold. Placed in the template rather
              than in each page so the six teacher-moment landings that share it all
              get the same entry point — the hero CTAs below route to pages that ask
              for an account first. */}
          <NoAccountCta locale={locale} className="mt-8" copy={content.noAccountCopy} />

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
        {answer && (
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
        )}

        {content.sections.map((section, i) => {
          const rendered = (
            <EducationSectionRenderer section={section} accent={content.accent} locale={locale} />
          );
          return revealSections ? (
            <ScrollRevealSection key={`${section.kind}-${i}`}>{rendered}</ScrollRevealSection>
          ) : (
            <Fragment key={`${section.kind}-${i}`}>{rendered}</Fragment>
          );
        })}

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

        {/*
          The page's own curated links render first; `EducationRelatedLinks` tops
          the rail up from the shared rotation so no landing page is an orphan.
          Curation alone produced a one-way silo — the six teacher-moment pages
          were linked from nowhere, footer and hub included.
        */}
        {footerCta?.position === 'beforeRelated' && footerCtaBlock}

        <EducationRelatedLinks
          locale={locale}
          slug={path.replace('/education/', '')}
          extra={content.related.map((r) => ({ href: r.href, label: r.label, accent: r.accent }))}
          count={Math.max(3, content.related.length + 3)}
        />

        {footerCta?.position !== 'beforeRelated' && footerCtaBlock}

        {showTeacherCta && <TeacherAccessCTA />}
        {showUpsell && <DistrictUpsellStrip hideTeacherCta={content.districtUpsellHideTeacherCta ?? true} />}
      </div>
    </main>
  );
}
