'use client';

import React from 'react';
import Link from 'next/link';
import Script from 'next/script';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { Gamepad2, Trophy, Lightbulb, Users, ArrowLeft, Play, Bot, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export default function RulesPageClient(): React.JSX.Element {
    const { language, dir, t } = useLanguage();
    const howToPlaySchema = generateHowToPlaySchema(language, t);

    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 }
    };

    // JSON-LD content is safe — sourced from our own translation strings, not user input
    const schemaJson = JSON.stringify(howToPlaySchema);

    return (
        <>
            {/* JSON-LD Schema for SEO */}
            <Script
                id="howto-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: schemaJson }}
            />
            <div dir={dir} className="flex-1 flex flex-col bg-neo-navy">
                <Header />

            <div className="max-w-4xl mx-auto px-2 sm:px-6 py-3 sm:py-10 page-content-safe flex-1">
                {/* Page Header - Compact */}
                <m.div
                    className="text-center mb-3 sm:mb-6"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mb-1 sm:mb-2">
                        {t('rules.pageTitle')}
                    </h1>
                    <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300">
                        {t('howToPlay.description')}
                    </p>
                </m.div>

                {/* HERO: Interactive Demo - First Thing Users See */}
                <m.section
                    id="interactive-tutorial"
                    className="mb-4 sm:mb-8"
                    {...fadeInUp}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="border-2 sm:border-4 border-neo-black shadow-hard-lg bg-white dark:bg-neo-navy-light overflow-hidden">
                        <CardHeader className="bg-linear-to-r from-neo-cyan/30 to-neo-pink/30 border-b-2 sm:border-b-4 border-neo-black py-2 sm:py-4">
                            <CardTitle className="flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-2xl font-black text-slate-900 dark:text-white">
                                <Gamepad2 className="text-neo-pink w-5 h-5 sm:w-6 sm:h-6" />
                                {t('footer.interactiveTutorial')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-6">
                            <div className="bg-linear-to-br from-neo-navy/5 to-neo-pink/5 rounded-lg sm:rounded-xl p-2 sm:p-4 flex justify-center">
                                <InteractiveGridDemo t={t} dir={dir} />
                            </div>
                        </CardContent>
                    </Card>
                </m.section>

                {/* Game Modes - Merged Section */}
                <m.section
                    className="mb-4 sm:mb-8"
                    {...fadeInUp}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="border-2 sm:border-4 border-neo-black shadow-hard-lg bg-white dark:bg-neo-navy-light">
                        <CardHeader className="bg-neo-lime/20 border-b-2 sm:border-b-4 border-neo-black py-2 sm:py-4">
                            <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-2xl font-black text-slate-900 dark:text-white">
                                <Play className="text-neo-black dark:text-white w-5 h-5 sm:w-6 sm:h-6" />
                                {t('rules.gameModes')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-6">
                            <div className="grid gap-2 sm:gap-4 sm:grid-cols-2">
                                {/* Multiplayer Card */}
                                <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-neo-cyan/10 border-2 sm:border-3 border-neo-black">
                                    <div className={`flex items-center gap-2 mb-2 sm:mb-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                        <Users className="text-neo-pink w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                        <h3 className="font-bold text-sm sm:text-lg text-slate-900 dark:text-white">{t('landing.multiPlayer')}</h3>
                                    </div>
                                    <ul className={`space-y-1 sm:space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 ${dir === 'rtl' ? 'text-right' : ''}`}>
                                        <li className={`flex items-start gap-1.5 sm:gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <CheckCircle className="text-neo-lime mt-0.5 shrink-0 w-3 h-3 sm:w-4 sm:h-4" />
                                            <span>{t('rules.joinOrCreateDesc')}</span>
                                        </li>
                                        <li className={`flex items-start gap-1.5 sm:gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <CheckCircle className="text-neo-lime mt-0.5 shrink-0 w-3 h-3 sm:w-4 sm:h-4" />
                                            <span>{t('rules.raceAgainstTimeDesc')}</span>
                                        </li>
                                        <li className={`flex items-start gap-1.5 sm:gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <CheckCircle className="text-neo-lime mt-0.5 shrink-0 w-3 h-3 sm:w-4 sm:h-4" />
                                            <span>{t('rules.competeAndWinDesc')}</span>
                                        </li>
                                    </ul>
                                    <div className="mt-2 sm:mt-4">
                                        <Button
                                            asChild
                                            size="sm"
                                            className="bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 font-bold w-full text-xs sm:text-sm py-1.5 sm:py-2 min-h-[44px]"
                                        >
                                            <Link href={`/${language}/multiplayer`}>
                                                <Users className={`w-3 h-3 sm:w-4 sm:h-4 me-1 sm:me-2`} />
                                                {t('landing.multiPlayer')}
                                            </Link>
                                        </Button>
                                    </div>
                                </div>

                                {/* Single Player Card */}
                                <div className="p-2 sm:p-4 rounded-lg sm:rounded-xl bg-neo-cyan/10 border-2 sm:border-3 border-neo-black">
                                    <div className={`flex items-center gap-2 mb-2 sm:mb-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                        <Bot className="text-neo-cyan w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                        <h3 className="font-bold text-sm sm:text-lg text-slate-900 dark:text-white">{t('landing.singlePlayer')}</h3>
                                    </div>
                                    <ul className={`space-y-1 sm:space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 ${dir === 'rtl' ? 'text-right' : ''}`}>
                                        <li className={`flex items-start gap-1.5 sm:gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <CheckCircle className="text-neo-lime mt-0.5 shrink-0 w-3 h-3 sm:w-4 sm:h-4" />
                                            <span>{t('rules.soloVsBotsDesc')}</span>
                                        </li>
                                        <li className={`flex items-start gap-1.5 sm:gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <CheckCircle className="text-neo-lime mt-0.5 shrink-0 w-3 h-3 sm:w-4 sm:h-4" />
                                            <span>{t('rules.practiceModeDesc')}</span>
                                        </li>
                                        <li className={`flex items-start gap-1.5 sm:gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <CheckCircle className="text-neo-lime mt-0.5 shrink-0 w-3 h-3 sm:w-4 sm:h-4" />
                                            <span>{t('rules.challengeModeDesc')}</span>
                                        </li>
                                    </ul>
                                    <div className="mt-2 sm:mt-4">
                                        <Button
                                            asChild
                                            size="sm"
                                            className="bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 font-bold w-full text-xs sm:text-sm py-1.5 sm:py-2 min-h-[44px]"
                                        >
                                            <Link href={`/${language}/singleplayer`}>
                                                <Bot className={`w-3 h-3 sm:w-4 sm:h-4 me-1 sm:me-2`} />
                                                {t('landing.singlePlayer')}
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </m.section>

                <InlineBannerAd webZone="content-page" className="my-4 sm:my-6" />

                {/* Compact Scoring System - 3 Rows */}
                <m.section
                    className="mb-4 sm:mb-8"
                    {...fadeInUp}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="border-2 sm:border-4 border-neo-black shadow-hard-lg bg-white dark:bg-neo-navy-light">
                        <CardHeader className="bg-neo-pink/10 border-b-2 sm:border-b-4 border-neo-black py-2 sm:py-4">
                            <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-2xl font-black text-slate-900 dark:text-white">
                                <Trophy className="text-amber-500 w-5 h-5 sm:w-6 sm:h-6" />
                                {t('howToPlay.scoringSystemTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-6">
                            <div className="overflow-x-auto -mx-1 sm:mx-0">
                                <table className="w-full border-collapse text-xs sm:text-base">
                                    <thead>
                                        <tr className="bg-neo-navy text-white">
                                            <th className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('rules.wordLength')}</th>
                                            <th className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('rules.points')}</th>
                                            <th className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black font-bold hidden sm:table-cell ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('rules.example')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-white dark:bg-neo-navy-elevated text-slate-900 dark:text-slate-100">
                                            <td className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black text-slate-900 dark:text-slate-100 ${dir === 'rtl' ? 'text-right' : ''}`}>3-4 {t('howToPlay.letters')}</td>
                                            <td className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black font-bold text-neo-cyan ${dir === 'rtl' ? 'text-right' : ''}`}>1-2 {t('howToPlay.pts')}</td>
                                            <td className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black text-slate-600 dark:text-slate-300 hidden sm:table-cell ${dir === 'rtl' ? 'text-right' : ''}`}>CAT, GAME</td>
                                        </tr>
                                        <tr className="bg-pink-100 dark:bg-slate-600">
                                            <td className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black text-slate-900 dark:text-slate-100 ${dir === 'rtl' ? 'text-right' : ''}`}>5-6 {t('howToPlay.letters')}</td>
                                            <td className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black font-bold text-pink-600 dark:text-pink-300 ${dir === 'rtl' ? 'text-right' : ''}`}>2-3 {t('howToPlay.pts')}</td>
                                            <td className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black text-slate-600 dark:text-slate-300 hidden sm:table-cell ${dir === 'rtl' ? 'text-right' : ''}`}>BRAIN</td>
                                        </tr>
                                        <tr className="bg-white dark:bg-neo-navy-elevated text-slate-900 dark:text-slate-100">
                                            <td className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black text-slate-900 dark:text-slate-100 ${dir === 'rtl' ? 'text-right' : ''}`}>7+ {t('howToPlay.letters')}</td>
                                            <td className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black font-bold text-pink-600 dark:text-pink-300 ${dir === 'rtl' ? 'text-right' : ''}`}>5+ {t('howToPlay.pts')}</td>
                                            <td className={`p-1.5 sm:p-3 border sm:border-2 border-neo-black text-slate-600 dark:text-slate-300 hidden sm:table-cell ${dir === 'rtl' ? 'text-right' : ''}`}>CHAMPION</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className={`text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 sm:mt-3 ${dir === 'rtl' ? 'text-right' : ''}`}>
                                <strong>{t('rules.proTip')}:</strong> {t('rules.proTipText')}
                            </p>
                        </CardContent>
                    </Card>
                </m.section>

                {/* Quick Tips - 3 Inline Tips */}
                <m.section
                    className="mb-4 sm:mb-8"
                    {...fadeInUp}
                    transition={{ delay: 0.5 }}
                >
                    <Card className="border-2 sm:border-4 border-neo-black shadow-hard-lg bg-white dark:bg-neo-navy-light">
                        <CardHeader className="bg-neo-pink/10 border-b-2 sm:border-b-4 border-neo-black py-2 sm:py-4">
                            <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-2xl font-black text-slate-900 dark:text-white">
                                <Lightbulb className="text-amber-500 w-5 h-5 sm:w-6 sm:h-6" />
                                {t('howToPlay.tipsTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 sm:p-6">
                            <div className="space-y-1.5 sm:space-y-3">
                                <div className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-neo-cyan/10 ${dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
                                    <span className="text-neo-cyan text-sm sm:text-lg font-bold shrink-0">1</span>
                                    <p className="text-xs sm:text-base text-slate-700 dark:text-slate-300">
                                        <strong className="text-slate-900 dark:text-white">{t('rules.scanPrefixes')}:</strong> {t('rules.scanPrefixesDesc')}
                                    </p>
                                </div>
                                <div className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-neo-pink/10 ${dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
                                    <span className="text-neo-pink text-sm sm:text-lg font-bold shrink-0">2</span>
                                    <p className="text-xs sm:text-base text-slate-700 dark:text-slate-300">
                                        <strong className="text-slate-900 dark:text-white">{t('rules.thinkWordFamilies')}:</strong> {t('rules.thinkWordFamiliesDesc')}
                                    </p>
                                </div>
                                <div className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-neo-lime/10 ${dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
                                    <span className="text-neo-lime text-sm sm:text-lg font-bold shrink-0">3</span>
                                    <p className="text-xs sm:text-base text-slate-700 dark:text-slate-300">
                                        <strong className="text-slate-900 dark:text-white">{t('rules.dontOverthink')}:</strong> {t('rules.dontOverthinkDesc')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </m.section>

                <InlineBannerAd webZone="content-page" className="my-4 sm:my-6" />

                {/* Call to Action */}
                <m.div
                    className="text-center py-3 sm:py-6"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                >
                    <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mb-2 sm:mb-3">
                        {t('rules.readyToTest')}
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-3 sm:mb-5 max-w-xl mx-auto">
                        {t('rules.readyToTestDesc')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                        <Button
                            asChild
                            size="lg"
                            className="bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 font-bold text-sm sm:text-lg px-4 sm:px-6 py-2.5 sm:py-5 w-full sm:w-auto"
                        >
                            <Link href={`/${language}`}>
                                <Play className={`w-4 h-4 sm:w-5 sm:h-5 me-1 sm:me-2`} />
                                {t('rules.startPlaying')}
                            </Link>
                        </Button>
                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="border-2 sm:border-3 border-neo-black font-bold text-sm sm:text-lg px-4 sm:px-6 py-2.5 sm:py-5 w-full sm:w-auto"
                        >
                            <Link href={`/${language}/leaderboard`}>
                                <Trophy className={`w-4 h-4 sm:w-5 sm:h-5 me-1 sm:me-2`} />
                                {t('leaderboard.viewLeaderboard')}
                            </Link>
                        </Button>
                    </div>
                </m.div>

                {/* Back to Home Button */}
                <div className="text-center pb-3 sm:pb-6">
                    <m.div
                        whileHover={{ x: dir === 'rtl' ? 4 : -4 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex"
                    >
                        <Link
                            href={`/${language}`}
                            className="
                                inline-flex items-center gap-1.5 sm:gap-2
                                min-h-[44px]
                                px-3 sm:px-5 py-2 sm:py-2.5
                                bg-neo-cream text-neo-black
                                font-bold text-sm sm:text-base
                                border-2 sm:border-3 border-neo-black
                                rounded-lg sm:rounded-xl shadow-hard
                                hover:bg-neo-lime
                                transition-colors duration-100
                            "
                        >
                            <ArrowLeft className={`w-4 h-4 sm:w-5 sm:h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                            {t('common.backToMenu')}
                        </Link>
                    </m.div>
                </div>
            </div>
            </div>
        </>
    );
}
