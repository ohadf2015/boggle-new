import type { Metadata } from 'next';
import { CtaBand, FaqList, LandingButton, LandingHero, LandingPage, Prose, Section, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { BASE_URL, CANONICAL, JOIN_CODE_LENGTH, faqs } from './seo';

/**
 * `/en/lexiclash-join` — the page a student lands on after typing "lexiclash join" into Google.
 *
 * Blooket gets ~1.8M "blooket join" searches a month and buys no search ads: students
 * look the join page up by name. Our real form at `/join` stays noindex and out of
 * robots (a code-entry frame, see app/robots.ts), so this is the crawlable answer. It
 * holds NO second code form (recurring pitfall class 3): every ask sends the student
 * to the one `JoinFlow` at `/{locale}/join`.
 */

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}


export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const pageUrl = CANONICAL;
  const title = 'LexiClash Join: Enter Your Game Code | LexiClash';
  const description = `Got a ${JOIN_CODE_LENGTH}-character code from your teacher or a friend? Join a LexiClash word game in seconds. No account needed, just a nickname.`;
  return {
    title,
    description,
    openGraph: {
      title: 'LexiClash Join: Enter Your Game Code',
      description,
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'Join a LexiClash game' }],
    },
    alternates: { canonical: pageUrl, languages: { 'x-default': pageUrl, en: pageUrl } },
    robots: { index: locale === 'en', follow: true },
  };
}


export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const joinHref = `/${locale}/join`;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${CANONICAL}#faq`,
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <LandingPage locale={locale} play={{ href: joinHref, label: 'Enter game code' }}>
      <script id="ld-lexiclash-join-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <LandingHero
        eyebrow="LexiClash Join"
        title="Got a code? Jump into the game."
        lead={`Type the ${JOIN_CODE_LENGTH}-character code from the board, pick a nickname, and you're in.`}
        actions={
          <>
            <LandingButton href={joinHref}>Enter game code</LandingButton>
            <LandingButton href={`/${locale}/education/classroom-game`} variant="secondary">
              I&apos;m a teacher
            </LandingButton>
          </>
        }
        art={LANDING_ART.friends('LexiClash mascots joining a word game together')}
        artTone="cyan"
      />

      <Section title="Join in three steps">
        <TileGrid
          variant="paper"
          items={[
            { title: '1. Get the code', body: 'Your teacher or the host shows it on their screen, or shares a link or QR code.' },
            { title: '2. Type it in', body: `Open the join page and enter all ${JOIN_CODE_LENGTH} characters. A QR code or link fills it in for you.` },
            { title: '3. Pick a nickname', body: 'No account needed. Tap GO and wait for the host to start the round.' },
          ]}
        />
      </Section>

      <Section title="Hosting the game instead?">
        <Prose paper>
          <p>
            Teachers start a classroom game, pick a word list and project the code. Students join from any device, and the
            class plays the same board at the same time.
          </p>
        </Prose>
      </Section>

      <Section title="Questions">
        <FaqList items={faqs} />
      </Section>

      <CtaBand
        tone="lime"
        title="Ready? Enter your code."
        body="The board is waiting."
        actions={<LandingButton href={joinHref}>Enter game code</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
