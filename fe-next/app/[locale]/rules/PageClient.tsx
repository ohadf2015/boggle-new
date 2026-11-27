'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Gamepad2, Trophy, Users, ArrowLeft, Play, Bot, CheckCircle } from 'lucide-react';
import { CompareTable, CtaBand, LandingButton, LandingPage, Section, Steps } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import { InlineBannerAd } from '@/components/ads';
import { useLanguage } from '@/contexts/LanguageContext';

// Generate localized JSON-LD Schema for How to Play page
function generateHowToPlaySchema(locale: string, t: (key: string) => string) {
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": t('rules.pageTitle'),
        "description": t('howToPlay.description'),
        "image": "https://www.lexiclash.live/og-image-en.webp",
        "inLanguage": locale,
        "totalTime": "PT2M",
        "estimatedCost": {
            "@type": "MonetaryAmount",
            "currency": "USD",
            "value": "0"
        },
        "step": [
            {
                "@type": "HowToStep",
                "position": 1,
                "name": t('landing.seo.step1'),
                "text": t('rules.joinOrCreateDesc'),
                "url": `https://lexiclash.live/${locale}/rules#step-1`
            },
            {
                "@type": "HowToStep",
                "position": 2,
                "name": t('landing.seo.step2'),
                "text": t('rules.raceAgainstTimeDesc'),
                "url": `https://lexiclash.live/${locale}/rules#step-2`
            },
            {
                "@type": "HowToStep",
                "position": 3,
                "name": t('landing.seo.step3'),
                "text": t('rules.competeAndWinDesc'),
                "url": `https://lexiclash.live/${locale}/rules#step-3`
            },
            {
                "@type": "HowToStep",
                "position": 4,
                "name": t('rules.proTip'),
                "text": t('rules.proTipText'),
                "url": `https://lexiclash.live/${locale}/rules#step-4`
            },
            {
                "@type": "HowToStep",
                "position": 5,
                "name": t('rules.readyToTest'),
                "text": t('rules.readyToTestDesc'),
                "url": `https://lexiclash.live/${locale}/rules#step-5`
            }
        ],
        "tool": [
            {
                "@type": "HowToTool",
                "name": "Web browser"
            },
            {
                "@type": "HowToTool",
                "name": "Internet connection"
            }
        ]
    };
}

// Dynamically import InteractiveGridDemo
const InteractiveGridDemo = dynamic(() => import('@/components/how-to-play/InteractiveGridDemo'), { ssr: false });

const PAPER = 'rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl';

export default function RulesPageClient({ children }: { children?: React.ReactNode }): React.JSX.Element {
    const { language, dir, t } = useLanguage();
    const howToPlaySchema = generateHowToPlaySchema(language, t);

    // JSON-LD content is safe — sourced from our own translation strings, not user input
    const schemaJson = JSON.stringify(howToPlaySchema);

    const modes = [
        {
            icon: <Users aria-hidden className="h-6 w-6" />,
            title: t('landing.multiPlayer'),
            items: [t('rules.joinOrCreateDesc'), t('rules.raceAgainstTimeDesc'), t('rules.competeAndWinDesc')],
            href: `/${language}/multiplayer`,
            tone: 'bg-neo-pink',
        },
        {
            icon: <Bot aria-hidden className="h-6 w-6" />,
            title: t('landing.singlePlayer'),
            items: [t('rules.soloVsBotsDesc'), t('rules.practiceModeDesc'), t('rules.challengeModeDesc')],
            href: `/${language}/quick-play`,
            tone: 'bg-neo-cyan',
        },
    ];

    return (
        <>
            <script
                id="howto-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: schemaJson }}
            />
            <div dir={dir} className="flex flex-1 flex-col bg-neo-navy">
                <Header />

                <LandingPage locale={language} topBar={false}>
                    <header className="flex max-w-3xl flex-col gap-4 lg:pt-6">
                        <h1 className="font-neo-display text-[2rem] font-bold leading-[1.1] text-balance sm:text-5xl lg:text-[3.25rem]">
                            {t('rules.pageTitle')}
                        </h1>
                        <p className="text-lg leading-relaxed text-neo-white/85">{t('howToPlay.description')}</p>
                    </header>

                    <section id="interactive-tutorial" className={cn(PAPER, '-mt-6 overflow-hidden sm:-mt-10')}>
                        <h2 className="flex items-center justify-center gap-2 border-b-3 border-neo-black bg-neo-yellow px-4 py-3 font-neo-display text-xl font-bold sm:text-2xl">
                            <Gamepad2 aria-hidden className="h-6 w-6" />
                            {t('footer.interactiveTutorial')}
                        </h2>
                        <div className="flex justify-center p-2 sm:p-6">
                            <InteractiveGridDemo t={t} dir={dir} />
                        </div>
                    </section>

                    <Section title={t('rules.gameModes')}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {modes.map((mode) => (
                                <div key={mode.href} className={cn(PAPER, 'flex flex-col overflow-hidden')}>
                                    <h3 className={cn('flex items-center gap-2 border-b-3 border-neo-black px-5 py-3 font-neo-display text-xl font-bold', mode.tone)}>
                                        {mode.icon}
                                        {mode.title}
                                    </h3>
                                    <ul className="flex flex-1 flex-col gap-2 p-5">
                                        {mode.items.map((item) => (
                                            <li key={item} className="flex items-start gap-2 leading-snug">
                                                <CheckCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="px-5 pb-5">
                                        <LandingButton href={mode.href} variant="dark" className="min-h-11 w-full py-2 text-base">
                                            {mode.title}
                                        </LandingButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <InlineBannerAd webZone="content-page" />

                    <Section title={t('howToPlay.scoringSystemTitle')}>
                        <CompareTable
                            columns={[t('rules.wordLength'), t('rules.points'), t('rules.example')]}
                            rows={[
                                [`3-4 ${t('howToPlay.letters')}`, `1-2 ${t('howToPlay.pts')}`, 'CAT, GAME'],
                                [`5-6 ${t('howToPlay.letters')}`, `2-3 ${t('howToPlay.pts')}`, 'BRAIN'],
                                [`7+ ${t('howToPlay.letters')}`, `5+ ${t('howToPlay.pts')}`, 'CHAMPION'],
                            ]}
                            caption={<span className="text-sm"><strong>{t('rules.proTip')}:</strong> {t('rules.proTipText')}</span>}
                        />
                    </Section>

                    <Section title={t('howToPlay.tipsTitle')}>
                        <Steps
                            items={[
                                { title: t('rules.scanPrefixes'), body: t('rules.scanPrefixesDesc') },
                                { title: t('rules.thinkWordFamilies'), body: t('rules.thinkWordFamiliesDesc') },
                                { title: t('rules.dontOverthink'), body: t('rules.dontOverthinkDesc') },
                            ]}
                        />
                    </Section>

                    <InlineBannerAd webZone="content-page" />

                    {children}

                    <CtaBand
                        tone="lime"
                        title={t('rules.readyToTest')}
                        body={t('rules.readyToTestDesc')}
                        actions={
                            <>
                                <LandingButton href={`/${language}`} variant="dark">
                                    <Play aria-hidden className="h-5 w-5" />
                                    {t('rules.startPlaying')}
                                </LandingButton>
                                <LandingButton href={`/${language}/leaderboard`} variant="secondary">
                                    <Trophy aria-hidden className="h-5 w-5" />
                                    {t('leaderboard.viewLeaderboard')}
                                </LandingButton>
                            </>
                        }
                        art={LANDING_ART.trophy('')}
                    />

                    <div className="flex justify-center">
                        <Link
                            href={`/${language}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-neo-white/25 px-5 text-sm font-bold text-neo-white/85 hover:border-neo-white/60 hover:text-neo-white"
                        >
                            <ArrowLeft aria-hidden className="h-4 w-4 rtl:rotate-180" />
                            {t('common.backToMenu')}
                        </Link>
                    </div>
                </LandingPage>
            </div>
        </>
    );
}
