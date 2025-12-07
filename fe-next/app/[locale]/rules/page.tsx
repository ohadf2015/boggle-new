'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { FaGamepad, FaTrophy, FaLightbulb, FaClock, FaUsers, FaStar, FaArrowLeft, FaPlay, FaHandPointer } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// Dynamically import HowToPlay to reduce initial bundle size
const HowToPlay = dynamic(() => import('@/components/HowToPlay'), { ssr: false });

export default function RulesPage(): React.JSX.Element {
    const { language, dir, t } = useLanguage();
    const [showInteractiveTutorial, setShowInteractiveTutorial] = useState(false);

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
                        LexiClash: Real-Time Word Battle
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                        Master the art of word hunting in this fast-paced multiplayer strategy game
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
                            <FaPlay className="mr-2" />
                            Play Now - It&apos;s Free!
                        </Button>
                    </Link>
                    <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setShowInteractiveTutorial(true)}
                        className="border-3 border-neo-black bg-neo-lime hover:bg-neo-lime/90 text-neo-black font-bold text-lg px-8 py-6 w-full sm:w-auto"
                    >
                        <FaHandPointer className="mr-2" />
                        {t('footer.interactiveTutorial') || 'Interactive Tutorial'}
                    </Button>
                </motion.div>

                {/* Interactive Tutorial Dialog */}
                <Dialog open={showInteractiveTutorial} onOpenChange={setShowInteractiveTutorial}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="sr-only">{t('howToPlay.title')}</DialogTitle>
                        </DialogHeader>
                        <HowToPlay onClose={() => setShowInteractiveTutorial(false)} />
                    </DialogContent>
                </Dialog>

                {/* How to Play Section */}
                <motion.section
                    className="mb-10"
                    {...fadeInUp}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-cyan/20 border-b-4 border-neo-black">
                            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                <FaGamepad className="text-neo-cyan" />
                                <h2>How to Play</h2>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                                LexiClash is a real-time multiplayer word game where players compete to find as many words as possible
                                from a grid of letters. Think of it as a competitive, digital version of classic word-finding games,
                                but with a modern twist that allows you to play with friends anywhere in the world.
                            </p>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="p-4 rounded-neo bg-neo-lime/10 border-3 border-neo-black">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaUsers className="text-neo-purple text-xl" />
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Join or Create a Room</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        Create your own game room or join an existing one using a room code. Share the code with friends to invite them instantly.
                                    </p>
                                </div>

                                <div className="p-4 rounded-neo bg-neo-pink/10 border-3 border-neo-black">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaClock className="text-neo-pink text-xl" />
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Race Against Time</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        When the game starts, you have a limited time (typically 90 seconds) to find as many valid words as possible from the letter grid.
                                    </p>
                                </div>

                                <div className="p-4 rounded-neo bg-neo-cyan/10 border-3 border-neo-black">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">🔤</span>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Swipe to Form Words</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        Connect adjacent letters by swiping or clicking to form words. Letters must be connected horizontally, vertically, or diagonally.
                                    </p>
                                </div>

                                <div className="p-4 rounded-neo bg-neo-purple/10 border-3 border-neo-black">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FaTrophy className="text-neo-yellow text-xl" />
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Compete & Win</h3>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        The player with the highest score when time runs out wins! Play multiple rounds to determine the ultimate word champion.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Scoring System Section */}
                <motion.section
                    className="mb-10"
                    {...fadeInUp}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-pink/20 border-b-4 border-neo-black">
                            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                <FaTrophy className="text-neo-yellow" />
                                <h2>Scoring System</h2>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                                In LexiClash, longer words earn you more points. The scoring system rewards strategic players
                                who hunt for longer, more complex words rather than just submitting many short words.
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-neo-navy text-white">
                                            <th className="p-3 text-left border-2 border-neo-black font-bold">Word Length</th>
                                            <th className="p-3 text-left border-2 border-neo-black font-bold">Points</th>
                                            <th className="p-3 text-left border-2 border-neo-black font-bold">Example</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-white dark:bg-slate-700">
                                            <td className="p-3 border-2 border-neo-black">3 letters</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-cyan">1 point</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-300">CAT, DOG, RUN</td>
                                        </tr>
                                        <tr className="bg-slate-50 dark:bg-slate-600">
                                            <td className="p-3 border-2 border-neo-black">4 letters</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-cyan">1 point</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-300">GAME, PLAY, WORD</td>
                                        </tr>
                                        <tr className="bg-white dark:bg-slate-700">
                                            <td className="p-3 border-2 border-neo-black">5 letters</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-lime">2 points</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-300">CLASH, SCORE, BRAIN</td>
                                        </tr>
                                        <tr className="bg-slate-50 dark:bg-slate-600">
                                            <td className="p-3 border-2 border-neo-black">6 letters</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-purple">3 points</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-300">PLAYER, WINNER, BATTLE</td>
                                        </tr>
                                        <tr className="bg-white dark:bg-slate-700">
                                            <td className="p-3 border-2 border-neo-black">7 letters</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-pink">5 points</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-300">LETTERS, VICTORY, COMPETE</td>
                                        </tr>
                                        <tr className="bg-slate-50 dark:bg-slate-600">
                                            <td className="p-3 border-2 border-neo-black">8+ letters</td>
                                            <td className="p-3 border-2 border-neo-black font-bold text-neo-yellow">11+ points</td>
                                            <td className="p-3 border-2 border-neo-black text-slate-600 dark:text-slate-300">CHAMPION, STRATEGY, LEGENDARY</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 rounded-neo bg-neo-yellow/20 border-3 border-neo-black">
                                <p className="text-slate-700 dark:text-slate-300">
                                    <strong>Pro Tip:</strong> Focus on finding 5-7 letter words for the best point-to-time ratio.
                                    While 8+ letter words give massive points, they&apos;re rare and time-consuming to find!
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.section>

                {/* Winning Strategies Section */}
                <motion.section
                    className="mb-10"
                    {...fadeInUp}
                    transition={{ delay: 0.5 }}
                >
                    <Card className="border-4 border-neo-black shadow-hard-lg bg-white dark:bg-slate-800">
                        <CardHeader className="bg-neo-purple/20 border-b-4 border-neo-black">
                            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                <FaLightbulb className="text-neo-yellow" />
                                <h2>Winning Strategies</h2>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                                Becoming a LexiClash champion requires more than just a good vocabulary. Here are proven strategies
                                used by top players to dominate their opponents and climb the leaderboard.
                            </p>

                            <div className="space-y-4">
                                <div className="flex gap-4 items-start p-4 rounded-neo bg-gradient-to-r from-neo-cyan/10 to-neo-purple/10 border-3 border-neo-black">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-cyan flex items-center justify-center text-neo-black font-bold text-lg border-3 border-neo-black">
                                        1
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Scan for Prefixes and Suffixes</h3>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            Look for common word parts like &quot;UN-&quot;, &quot;RE-&quot;, &quot;-ING&quot;, &quot;-ED&quot;, and &quot;-TION&quot;.
                                            These can help you quickly identify longer words hiding in the grid.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start p-4 rounded-neo bg-gradient-to-r from-neo-pink/10 to-neo-yellow/10 border-3 border-neo-black">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-pink flex items-center justify-center text-white font-bold text-lg border-3 border-neo-black">
                                        2
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Start from Vowels</h3>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            Most English words contain vowels. Start by locating A, E, I, O, U on the grid
                                            and build words around them for faster word discovery.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start p-4 rounded-neo bg-gradient-to-r from-neo-lime/10 to-neo-cyan/10 border-3 border-neo-black">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-lime flex items-center justify-center text-neo-black font-bold text-lg border-3 border-neo-black">
                                        3
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Think in Word Families</h3>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            When you find a word like &quot;PLAY&quot;, immediately check for variations: &quot;PLAYS&quot;, &quot;PLAYER&quot;,
                                            &quot;PLAYING&quot;, &quot;PLAYED&quot;. This technique can quickly multiply your score.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start p-4 rounded-neo bg-gradient-to-r from-neo-purple/10 to-neo-pink/10 border-3 border-neo-black">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-purple flex items-center justify-center text-white font-bold text-lg border-3 border-neo-black">
                                        4
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Don&apos;t Overthink Short Words</h3>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            Submit obvious 3-4 letter words quickly without hesitation. They add up fast and
                                            give you a solid foundation while you search for longer, higher-scoring words.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start p-4 rounded-neo bg-gradient-to-r from-neo-yellow/10 to-neo-lime/10 border-3 border-neo-black">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neo-yellow flex items-center justify-center text-neo-black font-bold text-lg border-3 border-neo-black">
                                        5
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Practice Pattern Recognition</h3>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            The more you play, the faster you&apos;ll recognize common letter patterns. Regular practice
                                            trains your brain to spot words almost instantly, giving you a significant edge.
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
                                <h2>Game Features</h2>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Multi-Language Support</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        Play in English, Hebrew, Swedish, or Japanese. Perfect for language learners!
                                    </p>
                                </div>
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Real-Time Multiplayer</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        Compete against friends or players worldwide in real-time word battles.
                                    </p>
                                </div>
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Achievements & Levels</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        Earn XP, unlock achievements, and climb the ranks as you improve.
                                    </p>
                                </div>
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Leaderboards</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        Track your progress and see how you rank against other players globally.
                                    </p>
                                </div>
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">No Download Required</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        Play instantly in your browser on any device - desktop, tablet, or mobile.
                                    </p>
                                </div>
                                <div className="p-4 rounded-neo bg-white dark:bg-slate-700 border-3 border-neo-black shadow-hard">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">QR Code Sharing</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        Generate QR codes to instantly invite friends to your game room.
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
                        Ready to Test Your Word Skills?
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-300 mb-6 max-w-xl mx-auto">
                        Join thousands of players in the ultimate word battle experience. Create a room,
                        invite your friends, and see who has the best vocabulary!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href={`/${language}`}>
                            <Button
                                size="lg"
                                className="bg-neo-cyan text-neo-black hover:bg-neo-cyan/90 font-bold text-lg px-8 py-6 w-full sm:w-auto"
                            >
                                <FaPlay className="mr-2" />
                                Start Playing Now
                            </Button>
                        </Link>
                        <Link href={`/${language}/leaderboard`}>
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-3 border-neo-black font-bold text-lg px-8 py-6 w-full sm:w-auto"
                            >
                                <FaTrophy className="mr-2" />
                                View Leaderboard
                            </Button>
                        </Link>
                    </div>
                </motion.div>

                {/* Back to Home Link */}
                <div className="text-center pb-8">
                    <Link
                        href={`/${language}`}
                        className="inline-flex items-center gap-2 text-neo-cyan hover:underline font-medium"
                    >
                        <FaArrowLeft />
                        Back to Home
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
}
