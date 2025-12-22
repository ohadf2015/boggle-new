'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { FaGamepad, FaTrophy, FaLightbulb, FaClock, FaUsers, FaStar, FaArrowLeft, FaPlay, FaHandPointer, FaRobot, FaBook, FaChartLine } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { useLanguage } from '@/contexts/LanguageContext';

// Dynamically import InteractiveGridDemo
const InteractiveGridDemo = dynamic(() => import('@/components/how-to-play/InteractiveGridDemo'), { ssr: false });

export default function RulesPage(): React.JSX.Element {
    const { language, dir, t } = useLanguage();
    const tutorialRef = useRef<HTMLElement>(null);

    const scrollToTutorial = () => {
        tutorialRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 }
    };

    return (
        <div dir={dir} className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <Header />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                {/* Page Header */}
                <motion.div
                    className="text-center mb-8 sm:mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
                        {t('rules.pageTitle')}
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-200 max-w-2xl mx-auto">
                        {t('rules.pageSubtitle')}
                    </p>
                </motion.div>

                {/* Quick Start CTA */}
                <motion.div
                    className="flex flex-col sm:flex-row justify-center gap-4 mb-8"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                >
                    <Link href={`/${language}`}>
                        <Button
                            size="lg"
                            className="bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 font-bold text-lg px-8 py-6 w-full sm:w-auto"
                        >
                            <FaPlay className={dir === 'rtl' ? 'ml-2' : 'mr-2'} />
                            {t('rules.playNowFree')}
                        </Button>
                    </Link>
                    <Button
                        size="lg"
                        variant="outline"
                        onClick={scrollToTutorial}
                        className="border-3 border-neo-black bg-neo-lime hover:bg-neo-lime/90 text-neo-black font-bold text-lg px-8 py-6 w-full sm:w-auto"
                    >
                        <FaHandPointer className={dir === 'rtl' ? 'ml-2' : 'mr-2'} />
                        {t('footer.interactiveTutorial')}
                    </Button>
                </motion.div>

                {/* Interactive Demo at Top */}
                <motion.section
                    ref={tutorialRef}
                    id="interactive-tutorial"
                    className="mb-10 scroll-mt-24"
                    {...fadeInUp}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-yellow/20 border-b-4 border-neo-black">
                            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                <FaHandPointer className="text-neo-pink" />
                                {t('footer.interactiveTutorial')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <p className="text-lg text-slate-700 dark:text-slate-200 leading-relaxed mb-6">
                                {t('howToPlay.description')}
                            </p>
                            <div className="bg-gradient-to-br from-neo-cyan/10 to-neo-pink/10 rounded-neo border-3 border-neo-black p-4 flex justify-center">
                                <InteractiveGridDemo t={t} dir={dir} />
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* How to Play Section */}
                <motion.section
                    className="mb-10"
                    {...fadeInUp}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-cyan/20 border-b-4 border-neo-black">
                            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                <FaGamepad className="text-neo-cyan" />
                                {t('howToPlay.title')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <p className="text-lg text-slate-700 dark:text-slate-200 leading-relaxed">
                                {t('rules.howToPlayIntro')}
                            </p>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="p-4 rounded-neo bg-neo-lime/10 border-3 border-neo-black">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaUsers className="text-neo-purple text-xl" />
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('rules.joinOrCreate')}</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300">
                                        {t('rules.joinOrCreateDesc')}
                                    </p>
                                </div>

                                <div className="p-4 rounded-neo bg-neo-pink/10 border-3 border-neo-black">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaClock className="text-neo-pink text-xl" />
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('rules.raceAgainstTime')}</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300">
                                        {t('rules.raceAgainstTimeDesc')}
                                    </p>
                                </div>

                                <div className="p-4 rounded-neo bg-neo-cyan/10 border-3 border-neo-black">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">🔤</span>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('rules.swipeToForm')}</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300">
                                        {t('rules.swipeToFormDesc')}
                                    </p>
                                </div>

                                <div className="p-4 rounded-neo bg-neo-purple/10 border-3 border-neo-black">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaTrophy className="text-neo-yellow text-xl" />
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('rules.competeAndWin')}</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300">
                                        {t('rules.competeAndWinDesc')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Single Player Modes Section */}
                <motion.section
                    className="mb-10"
                    {...fadeInUp}
                    transition={{ delay: 0.45 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-orange/20 border-b-4 border-neo-black">
                            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                <FaRobot className="text-neo-orange" />
                                {t('rules.singlePlayerTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <p className="text-lg text-slate-700 dark:text-slate-200 leading-relaxed">
                                {t('rules.singlePlayerIntro')}
                            </p>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="p-4 rounded-neo bg-neo-cyan/10 border-3 border-neo-black">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaRobot className="text-neo-cyan text-xl" />
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('rules.soloVsBots')}</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                                        {t('rules.soloVsBotsDesc')}
                                    </p>
                                </div>

                                <div className="p-4 rounded-neo bg-neo-lime/10 border-3 border-neo-black">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaBook className="text-neo-lime text-xl" />
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('rules.practiceMode')}</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                                        {t('rules.practiceModeDesc')}
                                    </p>
                                </div>

                                <div className="p-4 rounded-neo bg-neo-yellow/10 border-3 border-neo-black">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaChartLine className="text-neo-yellow text-xl" />
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{t('rules.challengeMode')}</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                                        {t('rules.challengeModeDesc')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <Link href={`/${language}/singleplayer`}>
                                    <Button
                                        size="lg"
                                        className="bg-neo-orange text-neo-black hover:bg-neo-orange/90 font-bold"
                                    >
                                        <FaPlay className={dir === 'rtl' ? 'ml-2' : 'mr-2'} />
                                        {t('landing.singlePlayer')}
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Scoring System Section */}
                <motion.section
                    className="mb-10"
                    {...fadeInUp}
                    transition={{ delay: 0.5 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-pink/20 border-b-4 border-neo-black">
                            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                <FaTrophy className="text-neo-yellow" />
                                {t('howToPlay.scoringSystemTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <p className="text-lg text-slate-700 dark:text-slate-200 leading-relaxed">
                                {t('rules.scoringIntro')}
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-neo-navy text-white">
                                            <th className="p-3 text-left border-2 border-neo-black font-bold">{t('rules.wordLength')}</th>
                                            <th className="p-3 text-left border-2 border-neo-black font-bold">{t('rules.points')}</th>
                                            <th className="p-3 text-left border-2 border-neo-black font-bold">{t('rules.example')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-white dark:bg-slate-700">
                                            <td className="p-3 border-2 border-neo-black text-slate-900 dark:text-slate-100">3 {t('howToPlay.letters')}</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-cyan">1 {t('howToPlay.pts')}</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-200">CAT, DOG, RUN</td>
                                        </tr>
                                        <tr className="bg-slate-50 dark:bg-slate-600">
                                            <td className="p-3 border-2 border-neo-black text-slate-900 dark:text-slate-100">4 {t('howToPlay.letters')}</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-cyan">1 {t('howToPlay.pts')}</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-200">GAME, PLAY, WORD</td>
                                        </tr>
                                        <tr className="bg-white dark:bg-slate-700">
                                            <td className="p-3 border-2 border-neo-black text-slate-900 dark:text-slate-100">5 {t('howToPlay.letters')}</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-lime">2 {t('howToPlay.pts')}</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-200">CLASH, SCORE, BRAIN</td>
                                        </tr>
                                        <tr className="bg-slate-50 dark:bg-slate-600">
                                            <td className="p-3 border-2 border-neo-black text-slate-900 dark:text-slate-100">6 {t('howToPlay.letters')}</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-purple">3 {t('howToPlay.pts')}</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-200">PLAYER, WINNER, BATTLE</td>
                                        </tr>
                                        <tr className="bg-white dark:bg-slate-700">
                                            <td className="p-3 border-2 border-neo-black text-slate-900 dark:text-slate-100">7 {t('howToPlay.letters')}</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-pink">5 {t('howToPlay.pts')}</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-200">LETTERS, VICTORY, COMPETE</td>
                                        </tr>
                                        <tr className="bg-slate-50 dark:bg-slate-600">
                                            <td className="p-3 border-2 border-neo-black text-slate-900 dark:text-slate-100">8+ {t('howToPlay.letters')}</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-yellow">11+ {t('howToPlay.pts')}</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-200">CHAMPION, STRATEGY</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 rounded-neo bg-neo-yellow/20 border-3 border-neo-black">
                                <p className="text-slate-700 dark:text-slate-200">
                                    <strong>{t('rules.proTip')}:</strong> {t('rules.proTipText')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Winning Strategies Section */}
                <motion.section
                    className="mb-10"
                    {...fadeInUp}
                    transition={{ delay: 0.55 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-purple/20 border-b-4 border-neo-black">
                            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                <FaLightbulb className="text-neo-yellow" />
                                {t('howToPlay.tipsTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <p className="text-lg text-slate-700 dark:text-slate-200 leading-relaxed">
                                {t('rules.strategiesIntro')}
                            </p>

                            <div className="space-y-4">
                                <div className="flex gap-4 items-start p-4 rounded-neo bg-gradient-to-r from-neo-cyan/10 to-neo-purple/10 border-3 border-neo-black">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-cyan flex items-center justify-center text-neo-black font-bold text-lg border-3 border-neo-black">
                                        1
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{t('rules.scanPrefixes')}</h3>
                                        <p className="text-slate-600 dark:text-slate-300">
                                            {t('rules.scanPrefixesDesc')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start p-4 rounded-neo bg-gradient-to-r from-neo-pink/10 to-neo-yellow/10 border-3 border-neo-black">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-pink flex items-center justify-center text-white font-bold text-lg border-3 border-neo-black">
                                        2
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{t('rules.startFromVowels')}</h3>
                                        <p className="text-slate-600 dark:text-slate-300">
                                            {t('rules.startFromVowelsDesc')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start p-4 rounded-neo bg-gradient-to-r from-neo-lime/10 to-neo-cyan/10 border-3 border-neo-black">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-lime flex items-center justify-center text-neo-black font-bold text-lg border-3 border-neo-black">
                                        3
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{t('rules.thinkWordFamilies')}</h3>
                                        <p className="text-slate-600 dark:text-slate-300">
                                            {t('rules.thinkWordFamiliesDesc')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start p-4 rounded-neo bg-gradient-to-r from-neo-purple/10 to-neo-pink/10 border-3 border-neo-black">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-purple flex items-center justify-center text-white font-bold text-lg border-3 border-neo-black">
                                        4
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{t('rules.dontOverthink')}</h3>
                                        <p className="text-slate-600 dark:text-slate-300">
                                            {t('rules.dontOverthinkDesc')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start p-4 rounded-neo bg-gradient-to-r from-neo-yellow/10 to-neo-lime/10 border-3 border-neo-black">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-yellow flex items-center justify-center text-neo-black font-bold text-lg border-3 border-neo-black">
                                        5
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{t('rules.practicePatterns')}</h3>
                                        <p className="text-slate-600 dark:text-slate-300">
                                            {t('rules.practicePatternsDesc')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Additional Game Features */}
                <motion.section
                    className="mb-10"
                    {...fadeInUp}
                    transition={{ delay: 0.6 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-lime/20 border-b-4 border-neo-black">
                            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                <FaStar className="text-neo-yellow" />
                                {t('howToPlay.gameFeaturesTitle')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{t('rules.multiLanguage')}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                                        {t('rules.multiLanguageDesc')}
                                    </p>
                                </div>
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{t('rules.realTimeMultiplayer')}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                                        {t('rules.realTimeMultiplayerDesc')}
                                    </p>
                                </div>
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{t('rules.achievementsLevels')}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                                        {t('rules.achievementsLevelsDesc')}
                                    </p>
                                </div>
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{t('rules.leaderboards')}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                                        {t('rules.leaderboardsDesc')}
                                    </p>
                                </div>
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{t('rules.noDownload')}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                                        {t('rules.noDownloadDesc')}
                                    </p>
                                </div>
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{t('rules.qrSharing')}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm">
                                        {t('rules.qrSharingDesc')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Call to Action */}
                <motion.div
                    className="text-center py-8"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, duration: 0.4 }}
                >
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-4">
                        {t('rules.readyToTest')}
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-200 mb-6 max-w-xl mx-auto">
                        {t('rules.readyToTestDesc')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href={`/${language}`}>
                            <Button
                                size="lg"
                                className="bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 font-bold text-lg px-8 py-6 w-full sm:w-auto"
                            >
                                <FaPlay className={dir === 'rtl' ? 'ml-2' : 'mr-2'} />
                                {t('rules.startPlaying')}
                            </Button>
                        </Link>
                        <Link href={`/${language}/leaderboard`}>
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-3 border-neo-black font-bold text-lg px-8 py-6 w-full sm:w-auto"
                            >
                                <FaTrophy className={dir === 'rtl' ? 'ml-2' : 'mr-2'} />
                                {t('leaderboard.viewLeaderboard')}
                            </Button>
                        </Link>
                    </div>
                </motion.div>

                {/* Back to Home Button */}
                <div className="text-center pb-8">
                    <Link href={`/${language}`}>
                        <motion.button
                            whileHover={{ x: -4 }}
                            whileTap={{ scale: 0.95 }}
                            className="
                                inline-flex items-center gap-2 sm:gap-3
                                px-5 sm:px-6 py-2.5 sm:py-3
                                bg-neo-cream text-neo-black
                                font-bold text-base sm:text-lg
                                border-3 border-neo-black
                                rounded-neo shadow-hard
                                hover:bg-neo-yellow
                                transition-colors duration-100
                            "
                        >
                            <FaArrowLeft />
                            {t('rules.backToHome')}
                        </motion.button>
                    </Link>
                </div>
            </main>
        </div>
    );
}
