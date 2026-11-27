'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from "@/components/ads";
import { GameModeJsonLd } from '@/components/seo/GameModeJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { CompareTable, LandingButton, LandingPage } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { getHowToPlayContent, type GameModeContent, type FAQItem, type ScoringRow } from './content';

const SITE_URL = 'https://www.lexiclash.live';

interface HowToPlayPageClientProps {
    locale: string;
    children?: React.ReactNode;
}

const art = LANDING_ART.brain('');

const H2 = 'font-neo-display text-2xl font-bold leading-tight text-balance sm:text-3xl';
const PAPER = 'rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl';
const MODE_TONE: Record<string, string> = { classic: 'bg-neo-lime', blast: 'bg-neo-orange', wordHunt: 'bg-neo-cyan' };

function GameModeSection({
    data,
    modeKey,
}: {
    data: GameModeContent;
    modeKey: string;
}) {
    return (
        <section className="flex scroll-mt-20 flex-col gap-5" aria-labelledby={`${modeKey}-heading`}>
            <div className="flex flex-col gap-2">
                <span aria-hidden className={cn('h-2 w-16 rounded-full border-2 border-neo-black', MODE_TONE[modeKey])} />
                <h2 id={`${modeKey}-heading`} className={H2} data-speakable="true">
                    {data.title}
                </h2>
                <p className="max-w-3xl leading-relaxed text-neo-white/80" data-speakable="true">
                    {data.description}
                </p>
            </div>
            <ol className={cn('grid gap-4', data.steps.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3')}>
                {data.steps.map((step, i) => (
                    <li
                        key={`${modeKey}-step-${i}-${step.title}`}
                        id={`${modeKey}-step-${i + 1}`}
                        className={cn(PAPER, 'flex flex-col gap-2 p-5')}
                    >
                        <span
                            aria-hidden="true"
                            className={cn('flex h-10 w-10 -rotate-3 items-center justify-center rounded-neo border-3 border-neo-black font-neo-display text-lg font-bold', MODE_TONE[modeKey])}
                        >
                            {i + 1}
                        </span>
                        <h3 className="font-neo-display text-lg font-bold leading-tight" data-speakable="true">
                            {step.title}
                        </h3>
                        <p className="text-[15px] leading-relaxed" data-speakable="true">
                            {step.description}
                        </p>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function ScoringTable({
    title,
    headers,
    rows,
    comboNote,
}: {
    title: string;
    headers: [string, string, string];
    rows: ScoringRow[];
    comboNote: string;
}) {
    return (
        <section className="flex flex-col gap-5" aria-labelledby="scoring-heading">
            <h2 id="scoring-heading" className={H2} data-speakable="true">
                {title}
            </h2>
            <CompareTable
                columns={headers}
                rows={rows.map((row) => [row.length, row.points, row.example])}
                caption={<span className="text-sm italic" data-speakable="true">{comboNote}</span>}
            />
        </section>
    );
}

function FAQSection({ title, items }: { title: string; items: FAQItem[] }) {
    return (
        <section className="flex flex-col gap-5" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className={H2} data-speakable="true">
                {title}
            </h2>
            <dl className="grid gap-4 lg:grid-cols-2">
                {items.map((item, i) => (
                    <div key={`faq-${i}-${item.question}`} className={cn(PAPER, 'p-5 shadow-hard-lg')}>
                        <dt className="mb-1 font-neo-display text-lg font-bold" data-speakable="true">{item.question}</dt>
                        <dd className="text-[15px] leading-relaxed" data-speakable="true">{item.answer}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

const BREADCRUMB_NAMES: Record<string, string> = { he: 'איך לשחק', ru: 'Как играть' };

export default function HowToPlayPageClient({ locale, children }: HowToPlayPageClientProps) {
    const c = getHowToPlayContent(locale);

    const breadcrumbs = [
        { name: 'Home', url: `${SITE_URL}/${locale}` },
        { name: BREADCRUMB_NAMES[locale] ?? 'How to Play', url: `${SITE_URL}/${locale}/how-to-play` },
    ];

    return (
        <div className="min-h-dvh bg-neo-navy">
            <BreadcrumbJsonLd items={breadcrumbs} />
            <GameModeJsonLd mode="classic" locale={locale} includeFaq />
            <GameModeJsonLd mode="blast" locale={locale} />
            <GameModeJsonLd mode="wordHunt" locale={locale} />

            <AutoHideHeader />

            <LandingPage locale={locale} topBar={false}>
                <header className="grid items-center gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-x-12 lg:pt-6">
                    <div className="order-2 flex flex-col items-start gap-4 lg:order-1">
                        <h1
                            className="font-neo-display text-[2rem] font-bold leading-[1.1] text-balance sm:text-5xl lg:text-[3.25rem]"
                            data-speakable="true"
                        >
                            {c.pageTitle}
                        </h1>
                        <p className="max-w-xl text-lg leading-relaxed text-neo-white/85" data-speakable="true">
                            {c.introText}
                        </p>
                        <LandingButton href={`/${locale}/quick-play`} className="w-full sm:w-auto">{c.cta.classic}</LandingButton>
                    </div>
                    <div className="order-1 flex justify-center lg:order-2">
                        <div className="flex w-full max-w-[16rem] -rotate-1 justify-center rounded-neo-lg border-3 border-neo-black bg-neo-purple p-3 shadow-hard-xl sm:max-w-sm sm:p-5 lg:max-w-md lg:p-8">
                            <Image src={art.src} alt={art.alt} width={art.width} height={art.height} priority sizes="(min-width: 1024px) 384px, 256px" className="h-32 w-auto sm:h-56 lg:h-80" />
                        </div>
                    </div>
                </header>

                <GameModeSection data={c.gameModes.classic} modeKey="classic" />

                <InlineBannerAd webZone="content-page" />

                <GameModeSection data={c.gameModes.blast} modeKey="blast" />

                <GameModeSection data={c.gameModes.wordHunt} modeKey="wordHunt" />

                <InlineBannerAd webZone="content-page" />

                <ScoringTable
                    title={c.scoring.title}
                    headers={c.scoring.headers}
                    rows={c.scoring.rows}
                    comboNote={c.scoring.comboNote}
                />

                <FAQSection title={c.faq.title} items={c.faq.items} />

                {children}

                <section
                    className="flex flex-col items-center gap-5 rounded-neo-lg border-3 border-neo-black bg-neo-yellow p-6 text-center text-neo-black shadow-hard-xl sm:p-10"
                    aria-labelledby="cta-heading"
                >
                    <h2 id="cta-heading" className={H2} data-speakable="true">
                        {c.cta.title}
                    </h2>
                    <p className="max-w-2xl font-medium">{c.cta.subtitle}</p>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
                        <LandingButton href={`/${locale}/quick-play`} variant="dark">{c.cta.classic}</LandingButton>
                        <LandingButton href={`/${locale}/blast`} variant="secondary">{c.cta.blast}</LandingButton>
                        <LandingButton href={`/${locale}/daily`} variant="secondary">{c.cta.daily}</LandingButton>
                        <LandingButton href={`/${locale}/multiplayer`} variant="secondary">{c.cta.multiplayer}</LandingButton>
                    </div>
                </section>
            </LandingPage>
        </div>
    );
}
