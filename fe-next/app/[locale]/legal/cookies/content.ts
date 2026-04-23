// Cookie Policy content — server-renderable for SEO

export type CookiesContent = {
  title: string;
  intro: string;
  whatAreCookies: { title: string; content: string };
  cookiesWeUse: {
    title: string;
    intro: string;
    essential: { title: string; items: string[] };
    analytics: { title: string; items: string[] };
    advertising: { title: string; items: string[] };
  };
  thirdPartyCookies: { title: string; intro: string; items: string[] };
  managingCookies: { title: string; intro: string; items: string[] };
  consent: { title: string; intro: string; items: string[] };
  changes: { title: string; content: string };
  contactUs: { title: string; content: string };
};

export const contentByLocale: Record<string, CookiesContent> = {
  en: {
    title: 'Cookie Policy',
    intro: 'This Cookie Policy explains how LexiClash uses cookies and similar technologies when you visit our website at lexiclash.live.',
    whatAreCookies: {
      title: '1. What Are Cookies',
      content: 'Cookies are small text files stored on your device by your web browser when you visit a website. They help websites remember your preferences, keep you logged in, and understand how you use the site. Similar technologies include localStorage and sessionStorage.',
    },
    cookiesWeUse: {
      title: '2. Cookies We Use',
      intro: 'We use the following categories of cookies:',
      essential: {
        title: 'Essential Cookies',
        items: [
          'Authentication tokens (Supabase) — keep you logged in securely',
          'User preferences (localStorage) — remember your username and settings',
          'Theme settings — remember your dark/light mode choice',
          'Language preference — remember your chosen language',
        ],
      },
      analytics: {
        title: 'Analytics Cookies',
        items: [
          'LogRocket — helps us understand how players use the game so we can improve the experience',
        ],
      },
      advertising: {
        title: 'Advertising Cookies',
        items: [
          'Google AdMob — serves ads to help support the game. Under child-directed treatment (TFCD) mode, no personalized advertising cookies are set',
          'Limited cookies may be used for ad frequency capping and aggregated ad reporting only — no cross-site tracking',
        ],
      },
    },
    thirdPartyCookies: {
      title: '3. Third-Party Cookies',
      intro: 'Some cookies are placed by third-party services we use:',
      items: [
        "Google AdMob — for serving non-personalized ads. Google may use cookies for frequency capping and reporting. See Google's Privacy Policy for details.",
        'LogRocket — for session replay and analytics to help us improve the game experience.',
      ],
    },
    managingCookies: {
      title: '4. Managing Cookies',
      intro: 'You have several options to control cookies:',
      items: [
        'Browser settings — most browsers let you block or delete cookies through their settings menu',
        'Our consent banner — when you first visit, our cookie consent banner lets you accept or decline non-essential cookies',
        'Opt out of Google ad personalization at Google Ad Settings',
        "Learn more about Google's data practices at Google Privacy Policy",
      ],
    },
    consent: {
      title: '5. Cookie Consent',
      intro: "When you first visit LexiClash, we show a cookie consent banner. Here's how it works:",
      items: [
        'Accept — enables analytics and advertising cookies for the best experience',
        'Decline — only essential cookies are used (authentication, preferences, language)',
        "You can change your preference at any time by clearing your browser's localStorage for lexiclash.live",
      ],
    },
    changes: {
      title: '6. Changes to This Policy',
      content: 'We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated date. Continued use of LexiClash after changes constitutes acceptance of the updated policy.',
    },
    contactUs: {
      title: '7. Contact Us',
      content: 'If you have questions about our use of cookies, please visit our Contact page.',
    },
  },
};
