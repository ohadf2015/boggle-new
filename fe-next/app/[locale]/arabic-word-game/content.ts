import type { ComingSoonContent } from '@/components/waitlist/ComingSoonLanding';

export const EN_CANONICAL = 'https://www.lexiclash.live/en/arabic-word-game';

export const enContent: ComingSoonContent = {
  lang: 'en',
  dir: 'ltr',
  canonical: EN_CANONICAL,
  breadcrumbHome: 'Home',
  h1: 'An Arabic word game you can play with friends is coming to LexiClash',
  intro:
    "LexiClash is a live word game that runs in the browser. Everyone gets the same grid of letters and races to find as many words as they can before the clock runs out. It already works in six languages, and Arabic is the one we're building next.",
  hero: {
    stamp: 'Arabic · coming soon',
    boardCaption: 'Kitab means “book”. Each letter touches the next one.',
    boardAlt: 'A four-by-four grid of Arabic letters with the word كتاب (book) traced through neighbouring tiles.',
  },
  waitlist: {
    heading: 'Arabic is coming soon',
    source: 'ar_waitlist_en',
    language: 'en',
    copy: {
      emailLabel: "Leave your email and we'll tell you when it launches",
      submit: 'Notify me',
      success: "You're on the list. We'll send you one email when Arabic is ready.",
      error: "We couldn't save that address. Check it and try again.",
      consent: 'One email when Arabic launches. Nothing else.',
    },
  },
  steps: {
    heading: 'How a round works',
    items: [
      {
        title: 'Open a room',
        body: 'You open a room and send the link to your friends. They join with a nickname, no account needed.',
      },
      { title: 'Same grid for everyone', body: 'Everyone sees the same letter grid at the same moment.' },
      {
        title: 'Connect the letters',
        body: 'You connect neighbouring letters (across, down or diagonally) to make words. Longer words score more.',
      },
      {
        title: 'Scores for everyone',
        body: 'A round lasts one minute by default, and the scoreboard shows up for everyone right after.',
      },
    ],
  },
  why: {
    heading: 'Why Arabic takes longer than other languages',
    paragraphs: [
      "Arabic letters join up and change shape depending on where they sit in a word. There are several ways to write the hamza and alef, there's the taa marbuta, and short words like al-, wa- and bi- attach straight onto the next word.",
      "We want a dictionary that accepts real words without handing out free points, so we won't ship Arabic until that holds up. How many people sign up here tells us how soon to put it first.",
    ],
    forms: { title: 'One letter, four shapes', labels: ['Alone', 'Start', 'Middle', 'End'] },
    hamza: {
      title: 'Alef and hamza',
      caption: 'There are four common ways to write alef, and the dictionary has to decide when they count as the same letter.',
    },
    prefix: {
      title: 'Words that attach',
      caption: 'The article al- joins straight onto the next word, so كتاب (book) becomes الكتاب (the book).',
    },
  },
  faqHeading: 'Questions',
  faqs: [
    {
      q: 'When will Arabic be available?',
      a: "There's no date yet. The dictionary and letter rules come first, and the size of this waitlist decides how high Arabic sits on our list. Sign up and you'll hear the moment it's ready.",
    },
    {
      q: 'Is it free?',
      a: 'Yes. The core game is free and runs in the browser on phones and computers, with nothing to install.',
    },
    {
      q: 'Can I play now?',
      a: "Yes, in English, Hebrew, Spanish, Swedish, Japanese or Russian. Arabic is the only one that isn't out yet.",
    },
    {
      q: 'Is it like Arabic Scrabble?',
      a: 'Not quite. In Scrabble you place a word and wait for your turn. Here there are no turns: everyone searches the same letter grid at the same time, and a round is usually over in a minute.',
    },
    {
      q: 'Will it work for Arabic learners and classrooms?',
      a: 'Teachers already use LexiClash for vocabulary practice in other languages, and Arabic will be added to the teacher tools when it launches.',
    },
    {
      q: 'What will you send me?',
      a: 'One email when Arabic launches. No newsletter and no promotions.',
    },
  ],
  playNow: {
    text: "Don't want to wait? Start an English game with your friends right now.",
    label: 'Play now',
    href: '/en/multiplayer',
    waitlistLabel: 'Join the waitlist',
  },
  sibling: { label: 'اقرأ هذه الصفحة بالعربية', href: '/en/laabat-kalimat-arabiya', lang: 'ar' },
};
