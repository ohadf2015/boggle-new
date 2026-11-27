import Link from 'next/link';
import { CtaBand, FaqList, LandingButton, LandingHero, LandingPage, Section, Steps } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { splitLead } from '@/components/landing/splitLead';

interface WheelLandingProps {
  locale: string;
  hero: { title: string; subtitle: string; description: string; cta: string; leaderboard: string };
  steps: Array<{ step: string; title: string; desc: string }>;
  stepsHeading: string;
  faqHeading: string;
  faqItems: Array<Record<string, string>>;
  finalCta: { heading: string; description: string; button: string };
  tower: { title: string; desc: string };
}

export function WheelLanding({ locale, hero, steps, stepsHeading, faqHeading, faqItems, finalCta, tower }: WheelLandingProps) {
  const playHref = `/${locale}/daily/word-wheel`;
  const [lead, rest] = splitLead(hero.description);

  return (
    <LandingPage locale={locale} play={{ href: playHref, label: hero.cta }}>
      <LandingHero
        eyebrow={hero.subtitle}
        title={hero.title}
        lead={lead}
        actions={
          <>
            <LandingButton href={playHref}>{hero.cta}</LandingButton>
            <LandingButton href={`/${locale}/leaderboard`} variant="secondary">{hero.leaderboard}</LandingButton>
          </>
        }
        art={LANDING_ART.wheel(hero.title)}
        artTone="lime"
        more={rest ? <p>{rest}</p> : undefined}
      />

      <Section title={stepsHeading}>
        <Steps items={steps.map((s) => ({ title: s.title, body: s.desc }))} />
      </Section>

      {faqItems.length > 0 && (
        <Section title={faqHeading}>
          <FaqList items={faqItems.map((f) => ({ q: f.q, a: f.a }))} />
        </Section>
      )}

      <CtaBand
        tone="cyan"
        title={finalCta.heading}
        body={
          <>
            <p>{finalCta.description}</p>
            <p className="mt-3">
              <Link href={`/${locale}/word-tower/daily`} className="font-bold underline decoration-2 underline-offset-4">
                {tower.title}
              </Link>
              : {tower.desc}
            </p>
          </>
        }
        actions={<LandingButton href={playHref}>{finalCta.button}</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
