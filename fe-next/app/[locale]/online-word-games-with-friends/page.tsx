import type { Metadata } from 'next';
import Link from 'next/link';
import { EducationIntentCta } from '@/components/education/EducationIntentCta';
import { ApalabradosSinDescargarLink } from '@/components/seo/ApalabradosSinDescargarLink';
import { BoggleAppFreeLink } from '@/components/seo/BoggleAppFreeLink';
import { AnagramSolverLink } from '@/components/seo/AnagramSolverLink';
import { DescargarScrabblePcLink } from '@/components/seo/DescargarScrabblePcLink';
import {
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Mark,
  Prose,
  Section,
  Steps,
  TileGrid,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';


interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const LINK_LINE = 'font-neo-body text-sm leading-relaxed text-neo-white';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';
  const pageUrl = `${BASE_URL}/en/online-word-games-with-friends`;

  return {
    title: 'Words With Friends Online Free — Real-Time, No App | LexiClash',
    description: 'Play Words With Friends 2 free online — real-time battles, no turns to wait! No app, no account, 2–50 players. Join in seconds →',
    keywords: 'online word games with friends, play word games with friends, multiplayer word game online, word games for groups, word game with friends free, online multiplayer word games like hanging with friends, word battle with friends, party word game online, word game for groups no download, online free word cloud game multiplayer, word games live with people',
    openGraph: {
      title: 'Words With Friends Online Free — Real-Time, No App | LexiClash',
      description: 'Real-time word battles with friends — no turns to wait! Create a room, share the link, play instantly. No app, no account. 2–50 players.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/en/online-word-games-with-friends/opengraph-image?v=2`, width: 1200, height: 630, alt: 'LexiClash - Online Word Games With Friends' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Words With Friends Online Free — Real-Time, No App | LexiClash',
      description: 'Real-time word battles with friends. No app, no account. Create a room, share the link, play instantly!',
      images: [`${BASE_URL}/en/online-word-games-with-friends/opengraph-image?v=2`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
      },
    },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqs = [
  {
    q: 'Can I play Words With Friends online for free, without the app?',
    a: "Words With Friends itself requires the mobile app and an account. LexiClash is a free alternative that runs entirely in your browser — no app, no account, no ads popping between turns. And instead of waiting for each other's moves, everyone plays the same grid live, so a whole rivalry resolves in one sitting.",
  },
  {
    q: 'How do I play word games online with friends?',
    a: "Go to LexiClash, tap 'Create Room', and share the link via text, WhatsApp, Discord, or any messenger. Friends click and join instantly — no signup or download. Up to 50 players can pile into one room.",
  },
  {
    q: 'Is this like Words With Friends but multiplayer?',
    a: "Same family, very different tempo. Words With Friends is turn-based and one-on-one — you play a word, then wait. LexiClash is real-time: the whole group races on the same grid simultaneously. It's faster, louder, and built for groups rather than duels.",
  },
  {
    q: 'What online multiplayer word games are like Hanging With Friends?',
    a: 'LexiClash captures the social, competitive spirit of Hanging With Friends with richer gameplay. Instead of guessing letters one at a time, you find words on a grid in real-time against friends — plus daily challenges, adventure mode, and brain training, all multiplayer.',
  },
  {
    q: 'Can I play word games with friends on different devices?',
    a: 'Yes — LexiClash works in any browser on phone, tablet, laptop, or desktop. iPhone friends can battle Android friends can battle that one friend on a smart TV. Everyone just needs the room link.',
  },
  {
    q: 'How many friends can play at once?',
    a: 'Up to 50 players in a single room, all on the same grid at the same time. That covers parties, classrooms, team-building events, and family game nights where grandma plays to win.',
  },
];

// Static JSON-LD — all content is hardcoded string literals, not user input
const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

export default async function OnlineWordGamesWithFriendsPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <LandingPage locale={locale} play={{ href: `/${locale}/multiplayer`, label: 'Play free' }}>
      {/* JSON-LD structured data for FAQ rich results — static content only, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqJsonLd }}
      />

      <LandingHero
        eyebrow="Live · Up to 50 friends"
        title={
          <>
            Play Words With Friends Online — <Mark>Free</Mark>, Real-Time, No App
          </>
        }
        lead="Looking for Words With Friends online, without the app and without the waiting?"
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>Create a Room — Play With Friends</LandingButton>
            <LandingButton href={`/${locale}/quick-play`} variant="secondary">Practice Solo First</LandingButton>
          </>
        }
        art={LANDING_ART.friends('Two LexiClash mascots high-fiving over a pile of letter tiles')}
        more={
          <>
            <p>
              Here&apos;s the catch with the classic: you take a turn, then wait hours — sometimes days — for
              your friend to notice. LexiClash is that same itch scratched at full speed: everyone plays the
              same letter grid at the same time, live, and the bragging rights settle in 3 minutes instead of
              3 weeks.
            </p>
            <p>
              Create a room, share one link, and up to 50 friends join instantly from any browser — phone,
              laptop, whatever they&apos;re holding. No download, no account, no &quot;your move... eventually.&quot;{' '}
              If the game you wanted is Boggle, you can{' '}
              <Link href={`/${locale}/play-boggle-online-free`}>play Boggle with friends online</Link> the same
              way: a room code, a QR, or the share button.
            </p>
          </>
        }
      />

      <Section title="How to Play With Friends">
        <Steps
          items={[
            { title: 'Create a room', body: 'Tap "Create Room" and customize your game — grid size, time limit, and game mode.' },
            { title: 'Share the link', body: 'Send the room link or QR code to friends via WhatsApp, Discord, text, or any messenger.' },
            { title: 'Play together', body: 'Everyone sees the same grid and races to find words in real-time. Longest words and fastest fingers win!' },
            { title: 'See results', body: 'After time runs out, see who found the most words, scored the highest, and discovered the rarest finds.' },
          ]}
        />
      </Section>

      <Section title="Why Real-Time Beats Turn-Based">
        <Prose>
          <p>
            Turn-based word games have a dirty secret: most matches never finish. Someone forgets, the
            notification gets buried, and three weeks later you&apos;re both pretending the game doesn&apos;t
            exist. Real-time flips that — a LexiClash round is 2–3 minutes of everyone shouting at the same
            grid, and it always ends with a winner.
          </p>
          <p>
            It also changes who you can play with. Async games work for two patient people. A live room works
            for a party: project the grid on a TV, everyone plays from their phone, and suddenly it&apos;s a
            game night — not a notification thread.
          </p>
        </Prose>
      </Section>

      <Section title="Multiplayer Game Modes">
        <TileGrid
          columns={4}
          items={[
            { title: 'Classic Battle', body: 'Find words on a grid. Highest score wins. The original word battle experience.' },
            { title: 'Word Hunt', body: 'Find specific target words before your opponents. Strategy meets speed.' },
            { title: 'Blast Mode', body: 'Chain words into combos for massive scores. Fast and furious word finding.' },
            { title: 'Daily Challenge', body: 'Everyone plays the same puzzle. Compare scores with friends and the world.' },
          ]}
        />
      </Section>

      <Section title="Frequently Asked Questions">
        <FaqList items={faqs} />
      </Section>

      <Section title="More Ways to Play">
        <TileGrid
          variant="paper"
          items={[
            { href: `/${locale}/daily-word-wheel`, title: 'Daily Word Wheel', body: 'Play the daily puzzle and compare scores with friends' },
            { href: `/${locale}/play-boggle-online-free`, title: 'Free Boggle Online', body: 'No download, no signup required' },
            { href: `/${locale}/best-online-word-games`, title: 'Best Word Games 2026', body: 'Complete comparison guide' },
            { href: `/${locale}/free-multiplayer-word-game`, title: 'Multiplayer Word Game Online', body: 'Real-time Scrabble alternative — play live' },
            { href: `/${locale}/scrabble-alternative-online`, title: 'Online Multiplayer Scrabble Alternative', body: 'One live grid for the whole group, in the browser' },
            { href: `/${locale}/word-games-online-free`, title: 'Word Games Online Free', body: '7+ free modes — no download, no signup' },
          ]}
        />
      </Section>

      <div>
        <EducationIntentCta locale={locale} variant="teachers" />
        <div className="flex flex-col gap-1">
          <BoggleAppFreeLink lead="The no-download page for a" className={LINK_LINE} />
          <AnagramSolverLink lead="Stuck mid-game? Unscramble any rack with the free" className={LINK_LINE} />
          <ApalabradosSinDescargarLink className={LINK_LINE} />
          <DescargarScrabblePcLink lead="En español, para el PC sin instalar nada:" className={LINK_LINE} />
        </div>
      </div>

      <CtaBand
        tone="pink"
        title="Ready to Play With Friends?"
        body="Create a room in seconds and invite friends to join. No downloads, no accounts, no hassle. Just real-time word battles with the people you want to play with."
        actions={<LandingButton href={`/${locale}/multiplayer`}>Play With Friends Now — Free</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
