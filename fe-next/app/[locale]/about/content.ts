// About page content — server-renderable for SEO
// Each locale has full content so Google crawler sees text without client hydration

export type AboutContent = {
  title: string;
  lastUpdated: string;
  whoWeAre: { title: string; content: string; content2: string };
  story: { title: string; content: string; content2: string };
  mission: { title: string; content: string; content2: string };
  whatMakesUsDifferent: {
    title: string;
    intro: string;
    gameModes: { title: string; content: string };
    multilingual: { title: string; content: string };
    education: { title: string; content: string };
    design: { title: string; content: string };
  };
  whatWeDo: { title: string; content: string; content2: string };
  technology: { title: string; content: string; content2: string };
  forEducators: { title: string; content: string; content2: string };
  community: { title: string; content: string; content2: string };
  values: {
    title: string;
    content: string;
    accessibility: { title: string; content: string };
    privacy: { title: string; content: string };
    fairPlay: { title: string; content: string };
  };
  team: { title: string; content: string };
  contact: { title: string; content: string };
  businessInfo: {
    title: string;
    companyLabel: string; company: string;
    founderLabel: string; founder: string;
    locationLabel: string; location: string;
    foundedLabel: string; founded: string;
    emailLabel: string; email: string;
    instagramLabel: string; instagram: string;
  };
};

export const contentByLocale: Record<string, AboutContent> = {
  en: {
    title: 'About LexiClash',
    lastUpdated: 'April 2026',
    whoWeAre: {
      title: 'Who We Are',
      content: 'LexiClash is a real-time multiplayer word strategy game developed by LexiClash Ltd, based in Israel. We create engaging, educational, and competitive word games for players of all ages — from young learners to seasoned word enthusiasts — across multiple languages and cultures.',
      content2: 'What started as a small passion project has grown into a platform that serves thousands of players worldwide. Our team combines deep expertise in game design, education technology, and multilingual software development to deliver a word gaming experience unlike any other. We are committed to making every game session fun, fair, and enriching.',
    },
    story: {
      title: 'Our Story',
      content: 'LexiClash was born in 2024 in Israel from a simple but powerful idea: what if word games could be as thrilling and competitive as esports, while also helping people learn new languages? Our founder, Ohad Fisher, grew up playing word games with family and friends in multiple languages. He noticed that while there were many word games available, none truly combined real-time competitive gameplay with meaningful language learning across different scripts and writing directions.',
      content2: 'Starting from a small prototype, the team built LexiClash from the ground up with multilingual support at its core — including full right-to-left (RTL) support for Hebrew. Within the first year, LexiClash grew to support five languages (Hebrew, English, Swedish, Japanese, and Spanish), introduced multiple original game modes, and built a growing community of players from over 30 countries who compete daily in word battles.',
    },
    mission: {
      title: 'Our Mission',
      content: 'Our mission is to make language learning fun, social, and competitive. We believe that the best way to expand your vocabulary and sharpen your language skills is through play. Traditional study methods like flashcards and rote memorization can feel tedious — but when you are racing against other players to form the longest word or hunting for hidden targets on a letter grid, learning happens naturally and joyfully.',
      content2: 'We are building LexiClash for everyone: children as young as 6 who are just beginning to read, teenagers looking for a fun challenge, adults who want to keep their minds sharp, and seniors who enjoy word puzzles. Our goal is to create a game that brings people together across languages, cultures, and generations — proving that words truly are universal.',
    },
    whatMakesUsDifferent: {
      title: 'What Makes Us Different',
      intro: 'LexiClash is not just another word game. We have designed every aspect of the experience to be original, inclusive, and deeply engaging. Here is what sets us apart from other word games on the market:',
      gameModes: {
        title: 'Original Game Modes',
        content: 'From Blast Mode — where tiles explode and cascade in chain reactions — to Word Hunt, where players race to find specific target words, and Daily Challenges that give every player the same puzzle to solve each day. Our Adventure Mode features 100 levels across 10 themed worlds with boss battles, special tiles, and power-ups.',
      },
      multilingual: {
        title: 'True Multilingual Support',
        content: 'We support 5 languages including Hebrew with full right-to-left layout support. Every game mode, every UI element, and every piece of feedback works flawlessly in all supported languages. Players can switch languages instantly and even practice vocabulary across different languages.',
      },
      education: {
        title: 'Education Integration',
        content: 'Our Education Mode lets teachers create custom word lessons, assign challenges to students, and track progress over time. Classrooms around the world use LexiClash as a supplementary learning tool that students actually enjoy using.',
      },
      design: {
        title: 'Bold Neo-Brutalist Design',
        content: 'Our distinctive visual style features chunky borders, hard shadows, and vibrant colors inspired by party games. The design is not just aesthetic — it ensures high contrast and readability for all players, including those with visual impairments.',
      },
    },
    whatWeDo: {
      title: 'What We Do',
      content: 'We develop real-time multiplayer word games that combine speed, strategy, and vocabulary skills into an experience that is both entertaining and educational. LexiClash supports Hebrew, English, Swedish, Japanese, and Spanish, with more languages planned for the future.',
      content2: 'Beyond the core game, we build tools for educators, host daily challenges and seasonal events, maintain competitive leaderboards, and continuously develop new game modes and features based on community feedback. Every update is driven by our players\' needs and our commitment to making the best word game platform in the world.',
    },
    technology: {
      title: 'Built for Speed',
      content: 'LexiClash is built with cutting-edge web technology including Next.js and real-time WebSocket connections. Our engine delivers sub-100ms response times for seamless multiplayer gameplay — when you submit a word, you see your score instantly. The game runs entirely in the browser with no app downloads needed, making it accessible on any device with an internet connection.',
      content2: 'We use server-side rendering for fast initial page loads, real-time data synchronization for live multiplayer matches, and intelligent caching to ensure smooth gameplay even on slower connections. Our infrastructure automatically scales to handle thousands of concurrent players, and we continuously monitor performance to maintain the responsive experience our players expect.',
    },
    forEducators: {
      title: 'For Educators',
      content: 'LexiClash was designed with education in mind from day one. Our Education Mode provides teachers with a powerful set of tools to integrate word games into their curriculum. Teachers can create custom word lists aligned with their lesson plans, assign timed challenges to individual students or entire classes, and monitor progress through detailed analytics dashboards.',
      content2: 'Research consistently shows that competitive word games improve vocabulary retention significantly compared to traditional study methods. By turning vocabulary practice into a game, students stay engaged longer and retain more. LexiClash is used in language arts classes, ESL programs, and foreign language courses around the world. Our multilingual support makes it especially valuable for bilingual education and language immersion programs.',
    },
    community: {
      title: 'Our Community',
      content: 'The LexiClash community is diverse, welcoming, and growing every day. From casual family game nights to intense competitive tournaments, our players span all ages, skill levels, and backgrounds. We host daily challenges where everyone plays the same puzzle, weekly leaderboard resets that keep competition fresh, and special themed events during holidays and cultural celebrations.',
      content2: 'We believe that the best games are shaped by their players. That is why we actively listen to community feedback through our social media channels and in-game feedback tools. Many of our most popular features — including Blast Mode and the streak system — were inspired by player suggestions. Join thousands of word game enthusiasts from over 30 countries who have made LexiClash their go-to word game.',
    },
    values: {
      title: 'What We Stand For',
      content: 'At LexiClash, our values guide every decision we make — from game design to data handling. We believe that games have the power to educate, connect, and inspire, and we take that responsibility seriously.',
      accessibility: {
        title: 'Accessibility & Inclusivity',
        content: 'LexiClash is free to play with no paywalls. We support screen readers, keyboard navigation, reduced motion, and high-contrast design to ensure everyone can play.',
      },
      privacy: {
        title: 'Privacy First',
        content: 'We protect player privacy — especially for younger players — with COPPA-compliant practices, child-safe advertising, and transparent data policies. We never sell personal data.',
      },
      fairPlay: {
        title: 'Fair Play',
        content: 'No pay-to-win mechanics, no unfair advantages. Every player competes on a level playing field. Our word validation and scoring systems are consistent and transparent.',
      },
    },
    team: {
      title: 'Our Team',
      content: 'LexiClash was founded by Ohad Fisher and a team of passionate word game enthusiasts, software engineers, and education specialists based in Israel. We are a small but dedicated team that cares deeply about creating the best multiplayer word gaming experience possible. Every team member brings a love of language, a passion for technology, and a commitment to making games that are fun, fair, and accessible to everyone.',
    },
    contact: {
      title: 'Contact Us',
      content: 'Have questions, feedback, or partnership inquiries? We would love to hear from you! Whether you are a player with a suggestion, a teacher interested in using LexiClash in your classroom, or a journalist looking for information, do not hesitate to reach out.',
    },
    businessInfo: {
      title: 'Business Information',
      companyLabel: 'Company Name',
      company: 'LexiClash Ltd',
      founderLabel: 'Founder',
      founder: 'Ohad Fisher',
      locationLabel: 'Location',
      location: 'Israel',
      foundedLabel: 'Founded',
      founded: '2024',
      emailLabel: 'Email',
      email: 'lexiclash.game@gmail.com',
      instagramLabel: 'Instagram',
      instagram: '@lexi.clash',
    },
  },
};
