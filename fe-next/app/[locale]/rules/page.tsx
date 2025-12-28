'use client';

import React from 'react';
import Link from 'next/link';
import Script from 'next/script';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { FaGamepad, FaTrophy, FaLightbulb, FaUsers, FaArrowLeft, FaPlay, FaRobot, FaCheckCircle } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';

// JSON-LD Schema for How to Play page
const howToPlaySchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Play LexiClash - Real-Time Word Battle Game",
    "description": "Learn how to play LexiClash, a fast-paced multiplayer word game where you compete to find words on a letter grid.",
    "image": "https://lexiclash.live/og-image.png",
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
            "name": "Join or Create a Game Room",
            "text": "Create your own game room or join an existing one using a room code. Share the code with friends to invite them instantly.",
            "url": "https://lexiclash.live/en/rules#step-1"
        },
        {
            "@type": "HowToStep",
            "position": 2,
            "name": "Find Words on the Grid",
            "text": "When the game starts, connect adjacent letters by swiping or clicking to form valid words. Letters must be connected horizontally, vertically, or diagonally.",
            "url": "https://lexiclash.live/en/rules#step-2"
        },
        {
            "@type": "HowToStep",
            "position": 3,
            "name": "Score Points",
            "text": "Longer words earn more points. 3-4 letter words give 1-2 points, 5-6 letter words give 2-3 points, and 7+ letter words give 5 or more points.",
            "url": "https://lexiclash.live/en/rules#step-3"
        },
        {
            "@type": "HowToStep",
            "position": 4,
            "name": "Build Combos for Bonus Points",
            "text": "Submit words quickly in succession to build combo multipliers. The faster you find words, the higher your combo bonus!",
            "url": "https://lexiclash.live/en/rules#step-4"
        },
        {
            "@type": "HowToStep",
            "position": 5,
            "name": "Win the Game",
            "text": "The player with the highest score when time runs out wins! Play multiple rounds to determine the ultimate word champion.",
            "url": "https://lexiclash.live/en/rules#step-5"
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

// Dynamically import InteractiveGridDemo
const InteractiveGridDemo = dynamic(() => import('@/components/how-to-play/InteractiveGridDemo'), { ssr: false });

export default function RulesPage(): React.JSX.Element {
    const { language, dir, t } = useLanguage();

    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 }
    };

    return (
        <>
            {/* JSON-LD Schema for SEO */}
            <Script
                id="howto-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(howToPlaySchema) }}
            />
            <div dir={dir} className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <Header />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                {/* Page Header - Compact */}
                <motion.div
                    className="text-center mb-6"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-2">
                        {t('rules.pageTitle')}
                    </h1>
                    <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
                        {t('howToPlay.description')}
                    </p>
                </motion.div>

                {/* HERO: Interactive Demo - First Thing Users See */}
                <motion.section
                    id="interactive-tutorial"
                    className="mb-8"
                    {...fadeInUp}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800 overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-neo-cyan/30 to-neo-pink/30 border-b-4 border-neo-black py-4">
                            <CardTitle className="flex items-center justify-center gap-3 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                <FaGamepad className="text-neo-pink" />
                                {t('footer.interactiveTutorial')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <div className="bg-gradient-to-br from-neo-navy/5 to-neo-purple/5 rounded-xl p-4 flex justify-center">
                                <InteractiveGridDemo t={t} dir={dir} />
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Game Modes - Merged Section */}
                <motion.section
                    className="mb-8"
                    {...fadeInUp}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-lime/20 border-b-4 border-neo-black py-4">
                            <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                <FaPlay className="text-neo-black dark:text-white" />
                                {t('rules.gameModes') || 'Game Modes'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* Multiplayer Card */}
                                <div className="p-4 rounded-xl bg-neo-cyan/10 border-3 border-neo-black">
                                    <div className={`flex items-center gap-2 mb-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                        <FaUsers className="text-neo-purple text-xl flex-shrink-0" />
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('landing.multiPlayer')}</h3>
                                    </div>
                                    <ul className={`space-y-2 text-sm text-slate-600 dark:text-slate-300 ${dir === 'rtl' ? 'text-right' : ''}`}>
                                        <li className={`flex items-start gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <FaCheckCircle className="text-neo-lime mt-0.5 flex-shrink-0" />
                                            <span>{t('rules.joinOrCreateDesc')}</span>
                                        </li>
                                        <li className={`flex items-start gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <FaCheckCircle className="text-neo-lime mt-0.5 flex-shrink-0" />
                                            <span>{t('rules.raceAgainstTimeDesc')}</span>
                                        </li>
                                        <li className={`flex items-start gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <FaCheckCircle className="text-neo-lime mt-0.5 flex-shrink-0" />
                                            <span>{t('rules.competeAndWinDesc')}</span>
                                        </li>
                                    </ul>
                                    <div className="mt-4">
                                        <Link href={`/${language}/multiplayer`}>
                                            <Button
                                                size="sm"
                                                className="bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 font-bold w-full"
                                            >
                                                <FaUsers className={dir === 'rtl' ? 'ml-2' : 'mr-2'} />
                                                {t('landing.multiPlayer')}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>

                                {/* Single Player Card */}
                                <div className="p-4 rounded-xl bg-neo-orange/10 border-3 border-neo-black">
                                    <div className={`flex items-center gap-2 mb-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                        <FaRobot className="text-neo-orange text-xl flex-shrink-0" />
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('landing.singlePlayer')}</h3>
                                    </div>
                                    <ul className={`space-y-2 text-sm text-slate-600 dark:text-slate-300 ${dir === 'rtl' ? 'text-right' : ''}`}>
                                        <li className={`flex items-start gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <FaCheckCircle className="text-neo-lime mt-0.5 flex-shrink-0" />
                                            <span>{t('rules.soloVsBotsDesc')}</span>
                                        </li>
                                        <li className={`flex items-start gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <FaCheckCircle className="text-neo-lime mt-0.5 flex-shrink-0" />
                                            <span>{t('rules.practiceModeDesc')}</span>
                                        </li>
                                        <li className={`flex items-start gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                                            <FaCheckCircle className="text-neo-lime mt-0.5 flex-shrink-0" />
                                            <span>{t('rules.challengeModeDesc')}</span>
                                        </li>
                                    </ul>
                                    <div className="mt-4">
                                        <Link href={`/${language}/singleplayer`}>
                                            <Button
                                                size="sm"
                                                className="bg-neo-orange text-neo-black hover:bg-neo-orange/90 font-bold w-full"
                                            >
                                                <FaRobot className={dir === 'rtl' ? 'ml-2' : 'mr-2'} />
                                                {t('landing.singlePlayer')}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Compact Scoring System - 3 Rows */}
                <motion.section
                    className="mb-8"
                    {...fadeInUp}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-pink/20 border-b-4 border-neo-black py-4">
                            <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                <FaTrophy className="text-amber-500" />
                                {t('howToPlay.scoringSystemTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-neo-navy text-white">
                                            <th className={`p-3 border-2 border-neo-black font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('rules.wordLength')}</th>
                                            <th className={`p-3 border-2 border-neo-black font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('rules.points')}</th>
                                            <th className={`p-3 border-2 border-neo-black font-bold ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('rules.example')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                                            <td className={`p-3 border-2 border-neo-black text-slate-900 dark:text-slate-100 ${dir === 'rtl' ? 'text-right' : ''}`}>3-4 {t('howToPlay.letters')}</td>
                                            <td className={`p-3 border-2 border-neo-black font-bold text-neo-cyan ${dir === 'rtl' ? 'text-right' : ''}`}>1-2 {t('howToPlay.pts')}</td>
                                            <td className={`p-3 border-2 border-neo-black text-slate-600 dark:text-slate-300 ${dir === 'rtl' ? 'text-right' : ''}`}>CAT, GAME, PLAY</td>
                                        </tr>
                                        <tr className="bg-slate-50 dark:bg-slate-600">
                                            <td className={`p-3 border-2 border-neo-black text-slate-900 dark:text-slate-100 ${dir === 'rtl' ? 'text-right' : ''}`}>5-6 {t('howToPlay.letters')}</td>
                                            <td className={`p-3 border-2 border-neo-black font-bold text-neo-purple ${dir === 'rtl' ? 'text-right' : ''}`}>2-3 {t('howToPlay.pts')}</td>
                                            <td className={`p-3 border-2 border-neo-black text-slate-600 dark:text-slate-300 ${dir === 'rtl' ? 'text-right' : ''}`}>BRAIN, PLAYER</td>
                                        </tr>
                                        <tr className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                                            <td className={`p-3 border-2 border-neo-black text-slate-900 dark:text-slate-100 ${dir === 'rtl' ? 'text-right' : ''}`}>7+ {t('howToPlay.letters')}</td>
                                            <td className={`p-3 border-2 border-neo-black font-bold text-neo-pink ${dir === 'rtl' ? 'text-right' : ''}`}>5+ {t('howToPlay.pts')}</td>
                                            <td className={`p-3 border-2 border-neo-black text-slate-600 dark:text-slate-300 ${dir === 'rtl' ? 'text-right' : ''}`}>VICTORY, CHAMPION</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className={`text-sm text-slate-500 dark:text-slate-400 mt-3 ${dir === 'rtl' ? 'text-right' : ''}`}>
                                <strong>{t('rules.proTip')}:</strong> {t('rules.proTipText')}
                            </p>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Quick Tips - 3 Inline Tips */}
                <motion.section
                    className="mb-8"
                    {...fadeInUp}
                    transition={{ delay: 0.5 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-purple/20 border-b-4 border-neo-black py-4">
                            <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                <FaLightbulb className="text-amber-500" />
                                {t('howToPlay.tipsTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <div className="space-y-3">
                                <div className={`flex items-start gap-3 p-3 rounded-lg bg-neo-cyan/10 ${dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
                                    <span className="text-neo-cyan text-lg flex-shrink-0">1</span>
                                    <p className="text-slate-700 dark:text-slate-300">
                                        <strong className="text-slate-900 dark:text-white">{t('rules.scanPrefixes')}:</strong> {t('rules.scanPrefixesDesc')}
                                    </p>
                                </div>
                                <div className={`flex items-start gap-3 p-3 rounded-lg bg-neo-pink/10 ${dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
                                    <span className="text-neo-pink text-lg flex-shrink-0">2</span>
                                    <p className="text-slate-700 dark:text-slate-300">
                                        <strong className="text-slate-900 dark:text-white">{t('rules.thinkWordFamilies')}:</strong> {t('rules.thinkWordFamiliesDesc')}
                                    </p>
                                </div>
                                <div className={`flex items-start gap-3 p-3 rounded-lg bg-neo-lime/10 ${dir === 'rtl' ? 'flex-row-reverse text-right' : ''}`}>
                                    <span className="text-neo-lime text-lg flex-shrink-0">3</span>
                                    <p className="text-slate-700 dark:text-slate-300">
                                        <strong className="text-slate-900 dark:text-white">{t('rules.dontOverthink')}:</strong> {t('rules.dontOverthinkDesc')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Call to Action */}
                <motion.div
                    className="text-center py-6"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                >
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-3">
                        {t('rules.readyToTest')}
                    </h2>
                    <p className="text-base text-slate-600 dark:text-slate-300 mb-5 max-w-xl mx-auto">
                        {t('rules.readyToTestDesc')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href={`/${language}`}>
                            <Button
                                size="lg"
                                className="bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 font-bold text-lg px-6 py-5 w-full sm:w-auto"
                            >
                                <FaPlay className={dir === 'rtl' ? 'ml-2' : 'mr-2'} />
                                {t('rules.startPlaying')}
                            </Button>
                        </Link>
                        <Link href={`/${language}/leaderboard`}>
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-3 border-neo-black font-bold text-lg px-6 py-5 w-full sm:w-auto"
                            >
                                <FaTrophy className={dir === 'rtl' ? 'ml-2' : 'mr-2'} />
                                {t('leaderboard.viewLeaderboard')}
                            </Button>
                        </Link>
                    </div>
                </motion.div>

                {/* Back to Home Button */}
                <div className="text-center pb-6">
                    <Link href={`/${language}`}>
                        <motion.button
                            whileHover={{ x: dir === 'rtl' ? 4 : -4 }}
                            whileTap={{ scale: 0.95 }}
                            className="
                                inline-flex items-center gap-2
                                px-5 py-2.5
                                bg-neo-cream text-neo-black
                                font-bold text-base
                                border-3 border-neo-black
                                rounded-xl shadow-hard
                                hover:bg-neo-yellow
                                transition-colors duration-100
                            "
                        >
                            <FaArrowLeft className={dir === 'rtl' ? 'rotate-180' : ''} />
                            {t('rules.backToHome')}
                        </motion.button>
                    </Link>
                </div>
            </main>
            </div>
        </>
    );
}
