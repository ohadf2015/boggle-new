import type { ReactNode } from 'react';
import { CompareTable, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Section } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { TeacherProCompareCheckoutStrip } from '@/components/education/TeacherProCompareCheckoutStrip';
import type { VsFoilCopy } from '@/lib/seo/vsFoilCopy';

/** Renders `**bold**` and `[label](url)` markers; everything else is plain text. */
function renderLede(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      return (
        <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="underline decoration-neo-cyan/60">
          {link[1]}
        </a>
      );
    }
    return part;
  });
}

export interface VsFoilPageProps {
  locale: string;
  copy: VsFoilCopy;
  /** Page slug, e.g. `lexiclash-vs-classpoint`. */
  slug: string;
  /** The translated honesty strip for this competitor. */
  strip: ReactNode;
  /** Locale-relative hrefs for `copy.related`, e.g. `/lexiclash-vs-socrative`. */
  relatedHrefs: readonly string[];
}

/** Shared layout of the short competitor-limit pages; all visible text comes from `copy`. */
export function VsFoilPage({ locale, copy: c, slug, strip, relatedHrefs }: VsFoilPageProps) {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const startHref = `/${locale}/education/classroom-game`;

  return (
    <LandingPage locale={locale} play={{ href: startHref, label: c.ctaStart }}>
      <script id={`${slug}-faq`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <LandingHero
        eyebrow={c.eyebrow}
        title={c.h1}
        lead={renderLede(c.lede)}
        actions={<LandingButton href={startHref}>{c.ctaStart}</LandingButton>}
        art={LANDING_ART.duel('')}
        artTone="cyan"
      />

      <div className="min-w-0">
        <TeacherProCompareCheckoutStrip locale={locale} />
        {strip}
      </div>

      <Section title={c.sideHeading}>
        <CompareTable
          columns={[c.thFeature, 'LexiClash', c.thCompetitor]}
          rows={c.rows.map((row) => [...row])}
          caption={c.footnote || undefined}
        />
      </Section>

      <Section title={c.faqHeading}>
        <FaqList items={c.faqs.map((f) => ({ q: f.q, a: f.a }))} />
      </Section>

      <LinkPills
        items={[
          { href: startHref, label: c.ctaStart },
          ...relatedHrefs.map((href, i) => ({ href: `/${locale}${href}`, label: c.related[i].label })),
        ]}
      />
    </LandingPage>
  );
}
