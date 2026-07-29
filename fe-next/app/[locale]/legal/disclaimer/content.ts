// Disclaimer content — server-renderable for SEO

export type DisclaimerSection = {
  title: string;
  content: string;
};

export type DisclaimerContent = {
  title: string;
  sections: DisclaimerSection[];
};

export const contentByLocale: Record<string, DisclaimerContent> = {
  en: {
    title: 'Disclaimer',
    sections: [
      {
        title: 'General Disclaimer',
        content: 'The information provided on LexiClash is for general entertainment and educational purposes only. While we strive for accuracy, we make no warranties or representations regarding the completeness, accuracy, or reliability of any content on this website. Your use of the site and reliance on any information is at your own risk.',
      },
      {
        title: 'Not Professional Advice',
        content: 'LexiClash is a word game platform. Nothing on this website constitutes professional, educational, linguistic, or any other form of advice. The game content, word definitions, and educational features are provided for entertainment and should not be relied upon as authoritative language references.',
      },
      {
        title: '"As Is" Basis',
        content: 'LexiClash is provided on an "as is" and "as available" basis without any warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free. Game scores, leaderboards, and statistics are provided for entertainment purposes.',
      },
      {
        title: 'Third-Party Links & Content',
        content: 'LexiClash may contain links to third-party websites or services. We have no control over the content, privacy policies, or practices of any third-party sites. We do not endorse or assume responsibility for any third-party content, products, or services.',
      },
      {
        title: 'Advertising Content',
        content: 'LexiClash displays advertisements provided by third-party ad networks including Google AdMob. These ads are not endorsements by LexiClash. Ad content is determined by the ad networks based on various factors and may not reflect the views or values of LexiClash. We are not responsible for the accuracy or content of advertisements displayed on the site.',
      },
      {
        title: 'Limitation of Liability',
        content: 'To the fullest extent permitted by law, LexiClash and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including but not limited to loss of data, loss of profits, or interruption of service.',
      },
      {
        title: 'Changes to This Disclaimer',
        content: 'We reserve the right to update this disclaimer at any time. Changes will be posted on this page with an updated revision date. Your continued use of LexiClash after changes constitutes acceptance of the updated disclaimer.',
      },
      {
        title: 'Contact Us',
        content: 'If you have questions about this disclaimer, please contact us at lexiclash.game@gmail.com.',
      },
    ],
  },
};
