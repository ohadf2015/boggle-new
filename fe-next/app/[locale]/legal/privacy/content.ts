// Privacy Policy content — server-renderable for SEO

export type PrivacySection = {
  title: string;
  content: string;
  items?: string[];
  subsections?: Array<{ title: string; items?: string[]; content?: string }>;
};

export type PrivacyContent = {
  title: string;
  intro: string;
  sections: PrivacySection[];
};

export const contentByLocale: Record<string, PrivacyContent> = {
  en: {
    title: 'Privacy Policy',
    intro: 'This Privacy Policy explains how LexiClash — operated by Ohad Fisher, an individual sole proprietor based in Israel ("we", "us") — collects, uses, and protects your personal information when you use our multiplayer word game and classroom platform at lexiclash.live. This document is not legal advice.',
    sections: [
      {
        title: '1. Information We Collect',
        content: 'We collect the following types of information:',
        items: [
          'Account data via Google/Discord OAuth: name, email address, and profile picture',
          'Player profile information: display name, avatar emoji/color, and custom profile pictures you upload',
          'Game statistics: scores, wins, words found, games played, time played, achievements, and leaderboard rankings',
          'Temporary game state: room information, current game data (stored temporarily in Redis with automatic deletion)',
          'Analytics data via LogRocket: session recordings, error logs, and usage patterns to help us improve the service',
        ],
      },
      {
        title: '2. How We Use Your Information',
        content: 'We use your information to: provide authentication and account features, display your profile and statistics to other players, maintain leaderboards and rankings, improve our service through analytics, send important service-related communications, and ensure fair play and enforce our Terms of Service.',
      },
      {
        title: '3. Third-Party Services',
        content: 'We use the following third-party services to operate LexiClash:',
        items: [
          'Supabase - For authentication, database storage, and profile picture storage',
          'LogRocket - For analytics, session recording, and error tracking',
          'Google - For OAuth authentication',
          'Discord - For OAuth authentication',
        ],
      },
      {
        title: '4. Third-Party Advertising',
        content: 'We display non-personalized advertisements via Google AdMob. Because LexiClash is designed for players of all ages, including children, our ad serving operates under Google\'s Child-Directed Treatment (TFCD) mode.',
        subsections: [
          {
            title: 'How Advertising Works',
            items: [
              'Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this and other websites',
              'Child-directed treatment (TFCD) is enabled by default, limiting ad personalization in compliance with COPPA',
              'We never sell your personal data to advertisers',
              'Ad revenue helps us keep LexiClash free to play',
              'Google may collect device-specific information (such as device type, operating system, and browser) and IP-based location data for ad serving, frequency capping, and aggregated reporting',
            ],
          },
          {
            title: 'Your Choices',
            content: 'You have several options to control advertising on LexiClash:',
            items: [
              'You may opt out of personalized advertising by visiting Google Ads Settings',
              'Review Google\'s privacy practices',
              'Learn about AdMob partner policies',
              'You can manage or delete cookies through your browser settings. Note that disabling cookies may affect site functionality.',
              'You may also opt out of third-party vendor ad cookies by visiting aboutads.info',
            ],
          },
        ],
      },
      {
        title: '5. Cookies and Local Storage',
        content: 'We use essential cookies and local storage for: authentication tokens (Supabase), username and preferences (localStorage), theme settings (dark/light mode), and language preferences. We also use LogRocket cookies for analytics purposes. Third-party vendors, including Google, use cookies for ad serving, frequency capping, and aggregated reporting. Advertising operates under child-directed treatment (TFCD) mode — no personalized advertising or cross-site tracking cookies are used. You can manage cookies through your browser settings: most browsers allow you to view, delete, and block cookies from websites. Please note that disabling essential cookies may prevent the site from functioning properly.',
      },
      {
        title: '6. Data Retention',
        content: 'Account and profile data is retained until you request deletion. Game statistics are retained to maintain leaderboard integrity. Temporary game state (Redis) is automatically deleted within 1 hour. Analytics data is retained according to LogRocket\'s policies.',
      },
      {
        title: '7. Data Security',
        content: 'We implement industry-standard security measures including: encrypted connections (HTTPS), secure OAuth authentication, encrypted database storage via Supabase, and secure WebSocket connections for real-time gameplay.',
      },
      {
        title: '8. Your Rights',
        content: 'You have the right to: access your personal data through your profile page, update your profile information at any time, delete your account and associated data, and request information about how your data is used.',
      },
      {
        title: '9. International Users',
        content: 'Your data may be transferred to and stored in countries outside your country of residence, including countries that may have different data protection laws. By using LexiClash, you consent to such transfers.',
      },
      {
        title: '10. Changes to This Policy',
        content: 'We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Your continued use of LexiClash after changes constitutes acceptance of the updated policy.',
      },
      {
        title: '11. Governing Law',
        content: 'This Privacy Policy is governed by the laws of the State of Israel. Any disputes shall be resolved in the courts located in Israel.',
      },
      {
        title: '12. Children\'s Privacy',
        content: 'LexiClash is designed for players ages 6 and up, including children. We are committed to complying with the Children\'s Online Privacy Protection Act (COPPA) and similar international regulations to protect children\'s privacy.',
        items: [
          'No personalized advertising — all ads are served in child-directed treatment (TFCD) mode, preventing interest-based ad targeting',
          'No advertising tracking cookies — we do not allow ad networks to track children\'s browsing behavior across websites',
          'Minimal data collection — we collect only the data necessary to provide the game experience',
          'Parental involvement — users under 13 require parental consent to create accounts, as stated in our Terms of Service',
          'No sale of children\'s data — we never sell, rent, or share personal information of any user, including children, to third parties for marketing purposes',
          'Parent/guardian contact — parents or guardians may contact us at lexiclash.game@gmail.com to review, delete, or manage their child\'s information',
        ],
      },
      {
        title: '13. Payments & Subscriptions',
        content: 'When you purchase a Pro subscription, payment is processed by Polar, which acts as the Merchant of Record for LexiClash. We receive confirmation of your subscription (plan, status, and billing period) but we do not receive or store your full payment-card details, which are handled by Polar and its payment processors. Polar also handles applicable taxes. For classroom/teacher accounts, we process the student data you provide on your instruction to deliver the service, as described in these policies and our Terms of Service.',
      },
    ],
  },
};
