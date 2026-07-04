import React from 'react';
import Link from 'next/link';
import { TopBackLink } from '@/components/navigation/TopBackLink';

/**
 * ComparisonLanding — the shared "LexiClash vs <competitor>" SEO landing template.
 *
 * Replaces ~29 hand-rolled vs-* pages that each reinvented the same hero / comparison /
 * feature / FAQ / CTA skeleton with drifting, off-brand styling (translucent /40 borders,
 * gray generic tables). This component is the single source of the neo-brutalist
 * "head-to-head scoreboard" design.
 *
 * Design contract (see docs/superpowers/specs/2026-06-03-seo-comparison-landing-kit.md):
 *  - Server-renderable, zero JS. HTML <details> accordions, no framer-motion.
 *  - Content arrives as plain string props — i18n (t()) is a separate, later project.
 *  - SEO is owned by the page: <h1>/copy passed verbatim, JSON-LD <script> stays in page.
 *  - Brand-correct: solid black borders (border-neo-thick), hard offset shadows, no
 *    translucent accent borders, lime CTAs (no recolor crusade).
 */

type CtaVariant = 'lime' | 'cyan' | 'pink' | 'purple';

export interface QuickCta {
  href: string;
  label: string;
  variant?: CtaVariant;
}

export interface ComparisonRow extends Array<string> {
  0: string; // feature
  1: string; // LexiClash value
  2: string; // competitor value
}

export interface ComparisonFeature {
  title: string;
  desc: string;
}

export interface GameplaySubsection {
  game: string;
  description: string;
  accent?: CtaVariant;
}

export interface CrossLink {
  href: string;
  title: string;
  subtitle: string;
}

export interface ComparisonLandingProps {
  locale: string;
  showBackLink?: boolean;

  // Hero
  h1: string;
  intro: string[];
  quickCtas: QuickCta[];

  // Scoreboard
  competitorName: string;
  comparisonRows: ComparisonRow[];
  featureLabel?: string;

  // Feature / pain-point grid
  featuresTitle: string;
  features: ComparisonFeature[];
  featuresStyle?: 'positive' | 'pain';

  // Optional gameplay explainer
  gameplaySection?: {
    title: string;
    subsections: GameplaySubsection[];
  };

  // FAQ
  faqs: { q: string; a: string }[];

  // Cross-links
  moreComparisons: CrossLink[];

  // Final CTA band
  finalCta: {
    title: string;
    body: string[];
    href: string;
    label: string;
  };
}

const CTA_BG: Record<CtaVariant, string> = {
  lime: 'bg-neo-lime',
  cyan: 'bg-neo-cyan',
  pink: 'bg-neo-pink',
  purple: 'bg-neo-purple',
};

const ACCENT_BAR: Record<CtaVariant, string> = {
  lime: 'bg-neo-lime',
  cyan: 'bg-neo-cyan',
  pink: 'bg-neo-pink',
  purple: 'bg-neo-purple',
};

/** Chunky uppercase section heading with a solid (never gradient) accent underbar. */
function SectionHeading({
  children,
  accent = 'lime',
  id,
}: {
  children: React.ReactNode;
  accent?: CtaVariant;
  id?: string;
}) {
  return (
    <div className="mb-6">
      <h2
        id={id}
        className="font-neo-display text-2xl font-black uppercase tracking-tight text-neo-cream sm:text-3xl"
      >
        {children}
      </h2>
      <span className={`mt-3 block h-1.5 w-16 rounded-neo-pill ${ACCENT_BAR[accent]}`} />
    </div>
  );
}

function QuickCtaButton({ cta }: { cta: QuickCta }) {
  const variant = cta.variant ?? 'lime';
  return (
    <Link
      href={cta.href}
      className={`rounded-neo border-neo-thick ${CTA_BG[variant]} px-6 py-3 text-center font-neo-display text-base font-black uppercase tracking-wide text-neo-navy shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed`}
    >
      {cta.label}
    </Link>
  );
}

/** The page's centrepiece: a neo-brutalist head-to-head scoreboard. */
function Scoreboard({
  competitorName,
  rows,
  featureLabel,
}: {
  competitorName: string;
  rows: ComparisonRow[];
  featureLabel?: string;
}) {
  return (
    <div
      data-testid="scoreboard-frame"
      className="overflow-hidden rounded-neo border-neo-thick shadow-hard-xl"
    >
      <table className="w-full border-collapse text-sm sm:text-base">
        <thead>
          <tr className="border-b-[3px] border-neo-black bg-neo-navy-elevated">
            <th className="px-4 py-4 text-left font-neo-display text-xs font-black uppercase tracking-wider text-neo-cream/70">
              {featureLabel || 'Feature'}
            </th>
            <th
              data-testid="winner-col-header"
              className="bg-neo-cyan px-4 py-4 text-center font-neo-display text-base font-black uppercase tracking-wide text-neo-navy"
            >
              LexiClash
            </th>
            <th
              data-testid="competitor-col-header"
              className="px-4 py-4 text-center font-neo-display text-base font-black uppercase tracking-wide text-neo-cream/50"
            >
              {competitorName}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([feature, lexi, competitor], idx) => (
            <tr
              key={feature}
              className={idx % 2 === 1 ? 'bg-neo-navy-light' : 'bg-neo-navy'}
            >
              <td className="px-4 py-3 font-medium text-neo-cream">
                {feature}
              </td>
              <td className="bg-neo-cyan/10 px-4 py-3 text-center font-semibold text-neo-cyan">
                {lexi}
              </td>
              <td className="px-4 py-3 text-center text-neo-cream/50">
                {competitor}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureGrid({
  features,
  style,
}: {
  features: ComparisonFeature[];
  style: 'positive' | 'pain';
}) {
  const pain = style === 'pain';
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {features.map((item) => (
        <div
          key={item.title}
          className="rounded-neo border-neo-thick bg-neo-navy-elevated p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <h3
            className={
              pain
                ? 'mb-1 font-neo-display font-black text-neo-cream/60 line-through decoration-neo-red decoration-2'
                : 'mb-1 font-neo-display font-black text-neo-lime'
            }
          >
            {item.title}
          </h3>
          <p className="text-sm leading-relaxed text-neo-cream/80">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function ComparisonLanding(props: ComparisonLandingProps) {
  const {
    showBackLink,
    h1,
    intro,
    quickCtas,
    competitorName,
    comparisonRows,
    featureLabel,
    featuresTitle,
    features,
    featuresStyle = 'positive',
    gameplaySection,
    faqs,
    moreComparisons,
    finalCta,
  } = props;

  return (
    <main className="min-h-screen bg-neo-navy text-neo-cream">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {showBackLink ? <TopBackLink className="mb-4" /> : null}

        {/* Hero */}
        <header className="mb-14">
          <h1 className="font-neo-display text-4xl font-black leading-[0.95] tracking-tight text-neo-cream sm:text-5xl lg:text-6xl">
            {h1}
          </h1>
          <div className="mt-6 max-w-[68ch] space-y-4">
            {intro.map((p, i) => (
              <p key={i} className="text-lg leading-relaxed text-neo-cream/85">
                {p}
              </p>
            ))}
          </div>
          {quickCtas.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {quickCtas.map((cta) => (
                <QuickCtaButton key={cta.href} cta={cta} />
              ))}
            </div>
          ) : null}
        </header>

        {/* Scoreboard */}
        <section className="mb-16">
          <SectionHeading accent="cyan">Head to Head</SectionHeading>
          <Scoreboard competitorName={competitorName} rows={comparisonRows} featureLabel={featureLabel} />
        </section>

        {/* Features / pain points */}
        <section data-testid="features-section" className="mb-16">
          <SectionHeading accent={featuresStyle === 'pain' ? 'pink' : 'lime'}>
            {featuresTitle}
          </SectionHeading>
          <FeatureGrid features={features} style={featuresStyle} />
        </section>

        {/* Optional gameplay explainer */}
        {gameplaySection ? (
          <section data-testid="gameplay-section" className="mb-16">
            <SectionHeading accent="purple">{gameplaySection.title}</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              {gameplaySection.subsections.map((sub) => (
                <div
                  key={sub.game}
                  className="rounded-neo border-neo-thick bg-neo-navy-elevated p-5 shadow-hard"
                >
                  <h3 className="mb-1 font-neo-display font-black text-neo-purple-light">
                    {sub.game}
                  </h3>
                  <p className="text-sm leading-relaxed text-neo-cream/80">
                    {sub.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* FAQ */}
        <section className="mb-16">
          <SectionHeading accent="lime">FAQ</SectionHeading>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <details
                key={`faq-${idx}-${faq.q}`}
                className="group rounded-neo border-neo-thick bg-neo-navy-elevated shadow-hard transition-all open:shadow-hard-lg"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-neo-display font-black uppercase tracking-wide text-neo-cream sm:px-6">
                  <span>{faq.q}</span>
                  <span
                    aria-hidden
                    className="shrink-0 text-neo-lime transition-transform duration-200 group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                <div className="border-t-[3px] border-neo-black px-5 py-4 leading-relaxed text-neo-cream/85 sm:px-6">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Cross-links */}
        {moreComparisons.length > 0 ? (
          <section className="mb-16">
            <SectionHeading accent="cyan">More Showdowns</SectionHeading>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {moreComparisons.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-neo border-neo-thick bg-neo-navy-elevated p-4 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
                >
                  <div className="font-neo-display font-black text-neo-cream">
                    {link.title}
                  </div>
                  <div className="text-sm text-neo-cream/60">{link.subtitle}</div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Final CTA band */}
        <section className="relative overflow-hidden rounded-neo border-neo-thick bg-neo-lime p-8 text-neo-navy shadow-hard-xl sm:p-12">
          <h2 className="font-neo-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
            {finalCta.title}
          </h2>
          <div className="mt-4 max-w-[60ch] space-y-3">
            {finalCta.body.map((p, i) => (
              <p key={i} className="text-lg font-medium leading-relaxed">
                {p}
              </p>
            ))}
          </div>
          <Link
            href={finalCta.href}
            className="mt-7 inline-block rounded-neo border-neo-thick bg-neo-navy px-8 py-4 font-neo-display text-lg font-black uppercase tracking-wide text-neo-cream shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-[1px] active:translate-y-[1px] active:shadow-hard-pressed"
          >
            {finalCta.label}
          </Link>
        </section>
      </div>
    </main>
  );
}
