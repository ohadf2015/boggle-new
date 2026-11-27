import React from 'react';
import {
  CompareTable,
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  LinkPills,
  Section,
  TileGrid,
  type LandingTone,
} from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { splitLead } from '@/components/landing/splitLead';

/**
 * The shared "LexiClash vs <competitor>" SEO landing, built from the landing kit.
 * SEO is owned by the page: h1/copy arrive verbatim and the JSON-LD <script> stays in the page.
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
  /** Kept for callers; every comparison page now gets the kit top bar. */
  showBackLink?: boolean;

  h1: string;
  intro: string[];
  quickCtas: QuickCta[];

  competitorName: string;
  comparisonRows: ComparisonRow[];
  featureLabel?: string;

  featuresTitle: string;
  features: ComparisonFeature[];
  featuresStyle?: 'positive' | 'pain';

  gameplaySection?: {
    title: string;
    subsections: GameplaySubsection[];
  };

  faqs: { q: string; a: string }[];

  moreComparisons: CrossLink[];

  finalCta: {
    title: string;
    body: string[];
    href: string;
    label: string;
  };
}

export function ComparisonLanding(props: ComparisonLandingProps) {
  const {
    locale,
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

  const [primary, secondary, ...extra] = quickCtas;
  const [lead, leadRest] = splitLead(intro[0] ?? '');
  const more = [leadRest, ...intro.slice(1)].filter(Boolean);
  const pain = featuresStyle === 'pain';

  return (
    <LandingPage locale={locale} play={primary ? { href: primary.href, label: primary.label } : undefined}>
      <LandingHero
        eyebrow={`LexiClash vs ${competitorName}`}
        title={h1}
        lead={lead}
        actions={
          primary ? (
            <>
              <LandingButton href={primary.href}>{primary.label}</LandingButton>
              {secondary && (
                <LandingButton href={secondary.href} variant="secondary">
                  {secondary.label}
                </LandingButton>
              )}
            </>
          ) : undefined
        }
        art={LANDING_ART.duel(`LexiClash mascot facing off against ${competitorName}`)}
        artTone="cyan"
        more={more.length ? more.map((p, i) => <p key={i}>{p}</p>) : undefined}
      >
        {extra.length > 0 && <LinkPills items={extra.map((c) => ({ href: c.href, label: c.label }))} />}
      </LandingHero>

      <Section title="Head to Head">
        <div data-testid="scoreboard-frame">
          <CompareTable
            columns={[featureLabel || 'Feature', 'LexiClash', competitorName]}
            rows={comparisonRows.map(([feature, lexi, competitor]) => [feature, lexi, competitor])}
          />
        </div>
      </Section>

      <Section title={featuresTitle} id="features">
        <div data-testid="features-section">
          <TileGrid
            columns={features.length % 3 === 0 ? 3 : 2}
            variant="paper"
            items={features.map((f, i) => ({
              title: pain ? <span className="line-through decoration-neo-red decoration-2">{f.title}</span> : f.title,
              body: f.desc,
              tone: (pain ? (['pink', 'orange'] as LandingTone[])[i % 2] : undefined),
            }))}
          />
        </div>
      </Section>

      {gameplaySection ? (
        <Section title={gameplaySection.title}>
          <div data-testid="gameplay-section">
            <TileGrid
              columns={2}
              items={gameplaySection.subsections.map((sub) => ({ title: sub.game, body: sub.description, tone: sub.accent }))}
            />
          </div>
        </Section>
      ) : null}

      <Section title="FAQ">
        <FaqList items={faqs} />
      </Section>

      {moreComparisons.length > 0 ? (
        <Section title="More Showdowns">
          <TileGrid
            variant="paper"
            items={moreComparisons.map((link) => ({ href: link.href, title: link.title, body: link.subtitle }))}
          />
        </Section>
      ) : null}

      <CtaBand
        tone="pink"
        title={finalCta.title}
        body={finalCta.body.map((p, i) => (
          <p key={i} className={i ? 'mt-3' : undefined}>
            {p}
          </p>
        ))}
        actions={<LandingButton href={finalCta.href}>{finalCta.label}</LandingButton>}
        art={LANDING_ART.trophy('')}
      />
    </LandingPage>
  );
}
