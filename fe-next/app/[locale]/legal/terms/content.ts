// Terms of Service content — server-renderable for SEO

export type TermsSection = {
  title: string;
  content: string;
};

export type TermsContent = {
  title: string;
  intro: string;
  sections: TermsSection[];
};

export const contentByLocale: Record<string, TermsContent> = {
  en: {
    title: 'Terms of Service',
    intro: 'Welcome to LexiClash. These Terms of Service govern your use of our multiplayer word game platform at lexiclash.live.',
    sections: [
      {
        title: '1. Acceptance of Terms',
        content: 'By accessing or using LexiClash, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our service. We reserve the right to modify these terms at any time, and your continued use constitutes acceptance of any changes.',
      },
      {
        title: '2. Description of Service',
        content: 'LexiClash is a multiplayer word game platform that allows users to play word-finding games in real-time with other players. The service includes single-player modes, multiplayer rooms, daily challenges, leaderboards, and related features. We reserve the right to modify, suspend, or discontinue any aspect of the service at any time.',
      },
      {
        title: '3. User Accounts',
        content: 'You may create an account using Google or Discord authentication. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You must be at least 13 years old to create an account. You agree to provide accurate information and to update it as necessary.',
      },
      {
        title: '4. User Conduct',
        content: 'You agree not to: use the service for any unlawful purpose; harass, abuse, or harm other users; cheat, use bots, or exploit bugs to gain unfair advantages; impersonate others or misrepresent your affiliation; interfere with or disrupt the service; attempt to gain unauthorized access to any part of the service; or engage in any activity that could damage, disable, or impair the service.',
      },
      {
        title: '5. User Content License',
        content: 'By submitting content to LexiClash (such as profile information, game data, or feedback), you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display such content in connection with providing and improving the service. You retain ownership of your content but agree that we may use anonymized and aggregated data for analytics and service improvement.',
      },
      {
        title: '6. Intellectual Property',
        content: 'LexiClash and its original content, features, and functionality are owned by LexiClash Ltd and are protected by international copyright, trademark, and other intellectual property laws. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.',
      },
      {
        title: '7. Disclaimers',
        content: 'The service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted, secure, or error-free. We disclaim all warranties, including but not limited to merchantability, fitness for a particular purpose, and non-infringement.',
      },
      {
        title: '8. Limitation of Liability',
        content: 'To the maximum extent permitted by law, LexiClash Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of or inability to use the service. Our total liability shall not exceed the amount you paid us in the past twelve months.',
      },
      {
        title: '9. Indemnification',
        content: "You agree to defend, indemnify, and hold harmless LexiClash Ltd and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorneys' fees) arising from your use of the service, your violation of these terms, or your violation of any rights of another.",
      },
      {
        title: '10. Termination',
        content: 'We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct that we believe violates these terms or is harmful to other users, us, or third parties. Upon termination, your right to use the service will immediately cease. You may also delete your account at any time through your profile settings.',
      },
      {
        title: '11. Modifications to Terms',
        content: 'We reserve the right to modify these terms at any time. We will provide notice of significant changes by posting the new terms on this page with an updated effective date. Your continued use of the service after any changes constitutes your acceptance of the new terms.',
      },
      {
        title: '12. Governing Law',
        content: 'These Terms of Service shall be governed by and construed in accordance with the laws of the State of Israel, without regard to its conflict of law provisions. Any legal action or proceeding arising out of these terms shall be brought exclusively in the courts located in Israel.',
      },
      {
        title: '13. Dispute Resolution',
        content: 'Any disputes arising from or relating to these terms or the service shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in accordance with Israeli arbitration laws, unless you are entitled to bring claims in small claims court.',
      },
      {
        title: '14. Severability',
        content: 'If any provision of these terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that these terms shall otherwise remain in full force and effect. The failure to enforce any right or provision of these terms shall not be deemed a waiver of such right or provision.',
      },
    ],
  },
};
