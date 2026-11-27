import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingButton, LandingPage, Prose } from '@/components/landing/kit';
import { withBodyLocales } from '@/lib/seo/bodyLocales';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SITE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const url = `${SITE_URL}/${locale}/editorial-policy`;
  return withBodyLocales({
    title: 'Editorial Policy & Standards - LexiClash',
    description:
      'How LexiClash researches, writes, fact-checks, reviews and updates every article. Our editorial standards, sourcing policy, corrections process, and AI disclosure.',
    alternates: {
      canonical: url,
      languages: {
        'x-default': `${SITE_URL}/en/editorial-policy`,
        en: `${SITE_URL}/en/editorial-policy`,
        he: `${SITE_URL}/he/editorial-policy`,
        sv: `${SITE_URL}/sv/editorial-policy`,
        ja: `${SITE_URL}/ja/editorial-policy`,
        es: `${SITE_URL}/es/editorial-policy`,
      },
    },
    robots: { index: true, follow: true },
  }, '/editorial-policy', locale);
}

export default async function EditorialPolicyPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <LandingPage locale={locale} className="max-w-3xl gap-8 sm:gap-10">
      <header className="flex flex-col items-start gap-4 lg:pt-6">
        <h1 className="font-neo-display text-[2rem] font-bold leading-[1.1] text-balance sm:text-5xl">
          Editorial Policy &amp; Standards
        </h1>
        <p className="rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-1 text-xs font-bold text-neo-black shadow-hard-sm">
          Last updated: March 26, 2026 · Owned by the LexiClash Editorial Team
        </p>
      </header>

      <Prose paper className="max-w-none space-y-8">

        <Section title="Our Mission">
          <p>
            LexiClash publishes word-game guides, cognitive-science explainers, and language-learning
            research. Every article exists to help a real player improve, learn, or make a better
            decision — never just to rank in search engines. If a topic does not pass that test, we do
            not publish it.
          </p>
        </Section>

        <Section title="Who Writes for LexiClash">
          <p>
            Articles are authored by{' '}
            <Link href={`/${locale}/about/ohad-fisher`}>
              Ohad Fisher
            </Link>
            , founder and editor-in-chief of LexiClash, with eight-plus years of hands-on word-game
            design, competitive Boggle play, and informal cognitive-science study. Guest contributors
            are identified by name in the byline and bio card on every post they write.
          </p>
          <p>
            Every contributor must disclose conflicts of interest before publication. We do not accept
            paid placements, sponsored links, or &ldquo;guest posts&rdquo; from agencies. Sponsored
            content, when it ever occurs, will be clearly labeled <em>Sponsored</em> at the top of the
            article.
          </p>
        </Section>

        <Section title="How We Research">
          <ol>
            <li>
              <strong>Primary play.</strong> Every game we cover is played for at least ten hours by
              the writer before any review or comparison is published. Screenshots and gameplay notes
              are taken during real sessions, not pulled from press kits.
            </li>
            <li>
              <strong>Peer-reviewed sources.</strong> Cognitive-science and language-learning claims
              are sourced from peer-reviewed journals (PubMed, JSTOR, Google Scholar), university
              publications, or recognized institutions (NIH, WHO, Oxford, Cambridge). We link directly
              to the source whenever the publisher allows it.
            </li>
            <li>
              <strong>Independent confirmation.</strong> Any factual claim that affects a
              player&apos;s decision (rule, score, dictionary size, language support) is independently
              verified against the official source before publication.
            </li>
            <li>
              <strong>Original data.</strong> When we can, we run our own measurements — vocabulary
              gains, session lengths, retention curves — and publish the methodology alongside the
              numbers.
            </li>
          </ol>
        </Section>

        <Section title="Fact-Checking &amp; Review">
          <p>
            Every article is reviewed before publication. The reviewer&apos;s job is to challenge every
            claim, check every external link, and confirm that sources actually say what the article
            claims they say. Articles touching on health, education, or scientific research receive an
            additional review focused on accuracy and nuance.
          </p>
          <p>
            We update articles when the underlying facts change. The <em>Last updated</em> date on
            every post reflects a real review, not a cosmetic edit. When we make a substantive change,
            we add a note at the bottom of the article explaining what changed and why.
          </p>
        </Section>

        <Section title="Sourcing &amp; Citations">
          <p>
            Where a claim is not common knowledge, we cite it. Citations appear inline as links and are
            also exposed in the article&apos;s structured data so search engines and assistive tools
            can surface them. We prefer primary sources over secondary aggregators. We never quote a
            study we have not read.
          </p>
        </Section>

        <Section title="Use of AI">
          <p>
            LexiClash articles are written and edited by humans. We sometimes use AI tools as a
            research assistant — for brainstorming outlines, finding relevant studies, or checking
            spelling and grammar — but no article on this site is generated by AI and published
            without a human author rewriting, fact-checking, and signing off on it. The voice,
            opinions, gameplay observations, and editorial judgment in every article come from a real
            person.
          </p>
        </Section>

        <Section title="Corrections Policy">
          <p>
            If you find an error, email{' '}
            <a href="mailto:editor@lexiclash.live">
              editor@lexiclash.live
            </a>{' '}
            with the article URL and the issue. We respond within five business days. Confirmed errors
            are corrected promptly, and substantive corrections are noted at the bottom of the article
            with the date of the correction.
          </p>
        </Section>

        <Section title="Independence &amp; Funding">
          <p>
            LexiClash is funded by display advertising, optional in-game purchases, and direct user
            support. Editorial decisions are made independently of advertisers. No advertiser sees an
            article before publication, and no advertiser can request a change after publication.
            Reviews of competing word games are written without contacting the developer first, so the
            experience reflects what a normal player will encounter.
          </p>
        </Section>

        <Section title="Contact the Editorial Team">
          <p>
            Editor-in-chief:{' '}
            <a href="mailto:editor@lexiclash.live">
              editor@lexiclash.live
            </a>
            <br />
            General contact:{' '}
            <Link href={`/${locale}/contact`}>
              /contact
            </Link>
            <br />
            Author profile:{' '}
            <Link href={`/${locale}/about/ohad-fisher`}>
              Ohad Fisher
            </Link>
          </p>
        </Section>

      </Prose>

      <LandingButton href={`/${locale}/about`} variant="secondary" className="self-start">
        &larr; Back to About
      </LandingButton>
    </LandingPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
