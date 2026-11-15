import type { ReactNode } from 'react';
import Link from 'next/link';
import { TopBackLink } from '@/components/navigation/TopBackLink';
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-neo-gray-100">
      <script id={`${slug}-faq`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <TopBackLink className="mb-4" />

      <header className="mb-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neo-cyan">{c.eyebrow}</p>
        <h1 className="mb-4 font-neo-display text-3xl font-bold sm:text-4xl">{c.h1}</h1>
        <p className="text-base leading-relaxed text-neo-gray-200 sm:text-lg">{renderLede(c.lede)}</p>
      </header>

      <TeacherProCompareCheckoutStrip locale={locale} />

      {strip}

      <section className="mb-12 overflow-x-auto">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">{c.sideHeading}</h2>
        <table className="w-full min-w-[640px] border-3 border-neo-gray-400 text-start text-sm">
          <thead className="bg-neo-navy/80">
            <tr>
              <th className="border-b-3 border-neo-gray-400 p-3 text-start">{c.thFeature}</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-start text-neo-lime">LexiClash</th>
              <th className="border-b-3 border-neo-gray-400 p-3 text-start">{c.thCompetitor}</th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map(([feature, lexi, other]) => (
              <tr key={feature} className="odd:bg-neo-navy/40">
                <td className="border-b border-neo-gray-500/40 p-3 font-medium">{feature}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{lexi}</td>
                <td className="border-b border-neo-gray-500/40 p-3">{other}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {c.footnote && <p className="mt-2 text-xs text-neo-gray-400">{c.footnote}</p>}
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-neo-display text-2xl font-bold">{c.faqHeading}</h2>
        <dl className="space-y-4">
          {c.faqs.map((f) => (
            <div key={f.q} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/40 p-4">
              <dt className="font-bold">{f.q}</dt>
              <dd className="mt-2 text-sm text-neo-gray-200">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-sm text-neo-gray-300">
        <Link href={`/${locale}/education/classroom-game`} className="text-neo-lime underline">
          {c.ctaStart}
        </Link>
        {relatedHrefs.map((href, i) => (
          <span key={href}>
            {' · '}
            <Link href={`/${locale}${href}`} className="underline">
              {c.related[i].label}
            </Link>
          </span>
        ))}
      </p>
    </main>
  );
}
