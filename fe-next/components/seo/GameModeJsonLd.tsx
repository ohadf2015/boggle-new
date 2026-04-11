import type { ReactNode } from 'react';

const SITE_URL = 'https://www.lexiclash.live';

type GameMode = 'classic' | 'blast' | 'wordHunt' | 'wordWheel';

interface GameModeJsonLdProps {
    mode: GameMode;
    locale: string;
    /** When true, emits a combined FAQPage schema covering all modes. Only set this on ONE instance per page to avoid duplicate FAQPage schemas. */
    includeFaq?: boolean;
}

const GAME_MODE_DATA = {
    classic: {
        name: 'How to Play LexiClash Classic Mode',
        description: 'Learn how to play the Classic word-finding mode in LexiClash where you race to find words on a letter grid.',
        totalTime: 'PT3M',
        steps: [
            { name: 'Start a Game', text: 'Create a room or start a single-player game. Choose Classic mode from the game mode selector.' },
            { name: 'Find Words on the Grid', text: 'Swipe or click adjacent letters on the 4x4 or 5x5 grid to form words. Letters must be connected horizontally, vertically, or diagonally.' },
            { name: 'Submit Words Quickly', text: 'Release your swipe or press submit to score. Longer words earn more points. Build combos by finding words in quick succession for score multipliers.' },
            { name: 'Compete Until Time Runs Out', text: 'The game lasts 3 minutes. In multiplayer, words found by all players score nothing - find unique words to win!' },
            { name: 'Check Your Results', text: 'After time expires, see the leaderboard showing scores, combos, and longest words. Challenge your friends to beat your score!' },
        ],
        faq: [
            { q: 'What is LexiClash Classic mode?', a: 'Classic mode is the original LexiClash game mode where players race to find as many words as possible on a shared letter grid within 3 minutes. Longer words and combos earn more points.' },
            { q: 'How long is a Classic mode game?', a: 'A standard Classic mode game lasts 3 minutes. The timer starts when the host begins the game in multiplayer, or immediately in single-player.' },
            { q: 'How are points scored in Classic mode?', a: 'Points scale with word length: 3-letter words earn 1 point, 4-letter words earn 3 points, 5-letter words earn 5 points, and longer words earn even more. Combo multipliers increase your score for consecutive quick finds.' },
            { q: 'Can I play Classic mode alone?', a: 'Yes! Classic mode supports single-player against AI bots at various difficulty levels, or you can practice solo to improve your skills before competing in multiplayer.' },
        ],
    },
    blast: {
        name: 'How to Play LexiClash Blast Mode',
        description: 'Learn how to play Blast mode in LexiClash - an explosive twist on word finding with tile-clearing mechanics.',
        totalTime: 'PT3M',
        steps: [
            { name: 'Select Blast Mode', text: 'Choose Blast mode from the game mode selector. The grid will feature special blast tiles mixed with regular letters.' },
            { name: 'Form Words to Clear Tiles', text: 'Swipe adjacent letters to form words. When submitted, the tiles used are cleared from the grid and new letters fall in from above.' },
            { name: 'Trigger Chain Reactions', text: 'Clearing tiles causes cascading effects. New letters falling into place may create opportunities for combo chains and bonus points.' },
            { name: 'Use Power-Ups Strategically', text: 'Special blast tiles clear entire rows or columns when used in a word. Plan your words to maximize tile destruction and score.' },
            { name: 'Survive and Score', text: 'Keep finding words before the grid fills up. The game ends when time runs out or no more moves are available. Highest score wins!' },
        ],
        faq: [
            { q: 'What makes Blast mode different from Classic?', a: 'Blast mode adds tile-clearing mechanics. When you submit a word, those tiles are destroyed and new letters cascade down, creating chain reaction opportunities for massive combos.' },
            { q: 'What are blast tiles?', a: 'Blast tiles are special tiles that clear entire rows or columns when included in a word. They appear randomly on the grid and add a strategic layer to word finding.' },
            { q: 'Is Blast mode available in multiplayer?', a: 'Yes! Blast mode supports both single-player and multiplayer. In multiplayer, all players see the same grid and compete for the highest blast combo scores.' },
        ],
    },
    wordHunt: {
        name: 'How to Play LexiClash Word Hunt',
        description: 'Learn how to play Word Hunt Survival in LexiClash - a daily Wordle-style puzzle where you find a hidden target word.',
        totalTime: 'PT5M',
        steps: [
            { name: 'Open Word Hunt', text: 'Navigate to the Daily Challenge section and select Word Hunt Survival. A new puzzle is available every day with the same board for all players worldwide.' },
            { name: 'Examine the Letter Grid', text: 'Study the letter grid carefully. The hidden target word can be formed by connecting adjacent letters on the grid.' },
            { name: 'Submit Your Guesses', text: 'Swipe letters to form words you think might be the target. You have 10 attempts to find the hidden word. Each guess gives you feedback clues.' },
            { name: 'Use Feedback Clues', text: 'After each guess, tiles light up to show which letters are correct and in the right position. Use these clues to narrow down the target word.' },
            { name: 'Share Your Results', text: 'Once you find the word (or run out of attempts), share your emoji results with friends - just like Wordle! Compare how many attempts it took.' },
        ],
        faq: [
            { q: 'How often does Word Hunt reset?', a: 'Word Hunt Survival resets daily at midnight UTC. Everyone worldwide plays the same puzzle each day, making it fun to compare results with friends.' },
            { q: 'How many guesses do I get in Word Hunt?', a: 'You get 10 attempts to find the hidden target word. Use the feedback clues from each guess to narrow down the answer.' },
            { q: 'Can I share my Word Hunt results?', a: 'Yes! After completing the puzzle, you can share emoji-based results showing your attempt pattern - similar to Wordle sharing. No spoilers included.' },
            { q: 'What happens if I miss a day?', a: 'Each day has a unique puzzle. If you miss a day, that puzzle is gone. But you can always play the current day\'s Word Hunt and compete on the daily leaderboard.' },
        ],
    },
    wordWheel: {
        name: 'How to Play LexiClash Daily Word Wheel',
        description: 'Learn how to play the Daily Word Wheel in LexiClash — a daily puzzle where you find words from a wheel of letters.',
        totalTime: 'PT5M',
        steps: [
            { name: 'Open the Word Wheel', text: 'Navigate to the Daily Challenge section and select Word Wheel. A new puzzle is available every day at midnight UTC with the same letters for all players worldwide.' },
            { name: 'Study the Wheel', text: 'Look at the letters arranged in a wheel. The center letter is highlighted — every word you form must include this letter.' },
            { name: 'Form Words', text: 'Tap or swipe letters to form words. Each word must include the center letter and use only the letters shown in the wheel. Longer words earn more points.' },
            { name: 'Beat the Clock', text: 'Find as many words as possible before time runs out. Speed and vocabulary both matter for your final score.' },
            { name: 'Compare and Share', text: 'See how you rank on the daily leaderboard. Share your results with friends and track your daily streak.' },
        ],
        faq: [
            { q: 'What is the Daily Word Wheel?', a: 'The Daily Word Wheel is a free daily word puzzle where you find words using letters arranged in a wheel. Every word must include the center letter. A new puzzle appears every day at midnight UTC with the same letters for everyone.' },
            { q: 'How is the Word Wheel different from Word Hunt?', a: 'Word Hunt gives you a grid and 10 attempts to find one hidden word. The Word Wheel gives you a wheel of letters and you find as many words as possible, all including the center letter. Both reset daily.' },
            { q: 'Do all words need the center letter?', a: 'Yes! Every word you submit must include the center letter of the wheel. This is the core constraint that makes the puzzle challenging and strategic.' },
            { q: 'Can I play the Word Wheel on my phone?', a: 'Yes! The Word Wheel works in any modern browser on phone, tablet, or desktop. No download or signup required.' },
        ],
    },
};

/**
 * Generates HowTo + FAQ JSON-LD schema for a specific game mode.
 * All content is static constants — safe for dangerouslySetInnerHTML.
 */
export function GameModeJsonLd({ mode, locale, includeFaq = false }: GameModeJsonLdProps): ReactNode {
    const data = GAME_MODE_DATA[mode];

    const schemas: Record<string, unknown>[] = [
        {
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: data.name,
            description: data.description,
            totalTime: data.totalTime,
            tool: { '@type': 'HowToTool', name: 'Web browser' },
            supply: { '@type': 'HowToSupply', name: 'Internet connection' },
            step: data.steps.map((step, i) => ({
                '@type': 'HowToStep',
                name: step.name,
                text: step.text,
                position: i + 1,
                url: `${SITE_URL}/${locale}/how-to-play#${mode}-step-${i + 1}`,
            })),
        },
    ];

    // Emit a single combined FAQPage for all game modes to avoid duplicate FAQPage schemas
    if (includeFaq) {
        const allFaqEntries = (Object.keys(GAME_MODE_DATA) as GameMode[]).flatMap(
            (m) => GAME_MODE_DATA[m].faq,
        );
        schemas.push({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: allFaqEntries.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.a,
                },
            })),
        });
    }

    // Safe: all content is from static constants, not user input
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
        />
    );
}

export default GameModeJsonLd;
