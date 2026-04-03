// FAQ page content — server-renderable for SEO
// Answers must be in HTML so Google crawler sees them without accordion interaction

export type FAQItem = {
  question: string;
  answer: string;
  category: string;
};

export type FAQContent = {
  title: string;
  subtitle: string;
  stillHaveQuestions: string;
  hereToHelp: string;
  contactUs: string;
  learnMore: string;
  blogCta: string;
  categories: {
    gettingStarted: string;
    gameplay: string;
    technical: string;
    account: string;
    privacy: string;
  };
  items: FAQItem[];
};

export const contentByLocale: Record<string, FAQContent> = {
  en: {
    title: 'FAQ',
    subtitle: 'Frequently Asked Questions',
    stillHaveQuestions: 'Still have questions?',
    hereToHelp: "We're here to help! Reach out to us anytime.",
    contactUs: 'Contact Us',
    learnMore: 'Want to learn more?',
    blogCta: 'Check out our blog for tips, strategies, and the science behind word games.',
    categories: {
      gettingStarted: 'Getting Started',
      gameplay: 'Gameplay',
      technical: 'Technical',
      account: 'Account',
      privacy: 'Privacy & Safety',
    },
    items: [
      {
        category: 'gettingStarted',
        question: 'What is LexiClash?',
        answer: 'LexiClash is a multiplayer word game where you compete against friends or AI opponents to find words on a shared board. Play solo, challenge daily puzzles, or compete in real-time multiplayer matches across Hebrew, English, Swedish, and Japanese.',
      },
      {
        category: 'gettingStarted',
        question: 'How do I create an account?',
        answer: 'You can play as a guest or create an account using Google Sign-In. Having an account lets you save your progress, track statistics, compete on leaderboards, and play across devices.',
      },
      {
        category: 'gettingStarted',
        question: 'Is LexiClash free to play?',
        answer: 'Yes! LexiClash is completely free to play. All game modes including singleplayer, multiplayer, and daily challenges are available at no cost.',
      },
      {
        category: 'gameplay',
        question: 'How do I score points?',
        answer: 'Points are awarded based on word length and letter values. Longer words score more points. Rare letters like Q, Z, and X have higher values. Bonus points are awarded for finding all words on the board.',
      },
      {
        category: 'gameplay',
        question: 'What game modes are available?',
        answer: 'LexiClash offers three main modes: (1) Singleplayer - practice against AI with various difficulty levels, (2) Multiplayer - real-time matches against other players, (3) Daily Challenge - compete on the same puzzle as players worldwide.',
      },
      {
        category: 'gameplay',
        question: 'How does the Daily Challenge work?',
        answer: 'Every day at midnight UTC, a new puzzle is generated that all players worldwide can attempt. You get one chance per day to find as many words as possible. Your score is recorded on the daily leaderboard.',
      },
      {
        category: 'gameplay',
        question: 'Can I play in multiple languages?',
        answer: 'Yes! LexiClash supports Hebrew, English, Swedish, and Japanese. You can switch languages in Settings. Each language has its own word dictionary and leaderboards.',
      },
      {
        category: 'technical',
        question: 'Which devices are supported?',
        answer: 'LexiClash works on all modern devices including desktop computers, tablets, and smartphones. We support the latest versions of Chrome, Firefox, Safari, and Edge browsers.',
      },
      {
        category: 'technical',
        question: 'Do I need an internet connection to play?',
        answer: 'Yes, an internet connection is required for multiplayer and daily challenges. However, you can play singleplayer mode offline if you have previously loaded the game.',
      },
      {
        category: 'technical',
        question: 'How do I report a bug or technical issue?',
        answer: 'If you encounter a bug, please contact us at lexiclash.game@gmail.com or reach out on Instagram @lexi.clash. Include details about what happened and which device/browser you were using.',
      },
      {
        category: 'account',
        question: 'How do I change my username or profile?',
        answer: 'Go to Settings (gear icon in the header) and navigate to the Profile section. You can update your username, avatar, and other profile details there.',
      },
      {
        category: 'account',
        question: 'Can I play on multiple devices?',
        answer: 'Yes! If you create an account using Google Sign-In, your progress, statistics, and settings sync automatically across all your devices.',
      },
      {
        category: 'account',
        question: 'How do I delete my account?',
        answer: 'To delete your account, go to Settings > Account > Delete Account. This action is permanent and will erase all your data including statistics, achievements, and game history.',
      },
      {
        category: 'privacy',
        question: 'Is my data safe?',
        answer: 'Yes. We take privacy seriously and only collect necessary data to operate the game. We use industry-standard encryption and never sell your personal information. See our Privacy Policy for full details.',
      },
      {
        category: 'privacy',
        question: 'Does LexiClash show ads?',
        answer: 'We partner with Google AdSense to display relevant advertisements. Ads help us keep the game free for everyone. You can learn more about ad personalization and opt-out options in our Privacy Policy.',
      },
      {
        category: 'privacy',
        question: 'Can I opt out of data collection?',
        answer: 'While some data collection is necessary for the game to function (like your username and scores), you can opt out of analytics and personalized ads in Settings > Privacy.',
      },
    ],
  },
};
