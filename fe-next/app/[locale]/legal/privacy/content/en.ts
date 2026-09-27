import { GOOGLE_LIMITED_USE_CLAUSE, GOOGLE_LIMITED_USE_URL, type PrivacyContent } from './shared';

export const en: PrivacyContent = {
    title: 'Privacy Policy',
    intro: `This Privacy Policy explains how LexiClash — operated by Ohad Fisher, an individual sole proprietor based in Israel ("we", "us") — collects, uses, and protects your personal information when you use our multiplayer word game and classroom platform at lexiclash.live. This document is not legal advice.`,
    sections: [
      {
        title: '1. Information We Collect',
        content: `We collect the following categories of information, depending on how you use LexiClash:`,
        items: [
          `Account & sign-in data: if you sign in with Google or Discord, we receive your name, email address, and profile picture from that provider (see "Google User Data" below for what Google Sign-In specifically shares); this is handled by Supabase Auth.`,
          `Player profile: your display name, avatar (emoji, color, or an image you upload), and in-game preferences.`,
          `Gameplay data: scores, words found, wins, games played, time played, achievements, and leaderboard standings.`,
          `Temporary session data: the current room/game state, held in Redis and deleted automatically, typically within an hour of the game ending.`,
          `Classroom data, if you or your school use our teacher tools: classroom names, join codes, the list of students in a classroom, lesson assignments, and each student's practice/progress records for lessons you assign. Guest students who join with a classroom code do not provide a name or email — they get an anonymous account.`,
          `Optional Google Classroom sync data, only if a teacher connects it: see the dedicated "Google User Data" section below.`,
          `Payment data: if you subscribe to Pro, our payment processor Polar shares your subscription plan, status, and billing period with us. We never receive or store your full card number.`,
          `Messages you send us: if you use our contact or feedback forms, we keep the message and the email address you provided so we can reply.`,
          `Technical & analytics data, only with your consent: device/browser type, pages viewed, and in-app events, collected via PostHog, Google Analytics, and LogRocket, as described in "Third-Party Services" and "Cookies and Local Storage". When you're signed in, PostHog and LogRocket also link that data to your account: your display name, whether you're a teacher/admin, and gameplay stats (level, scores, streaks); PostHog may also receive your email address to recognize you across sessions.`,
          `Crash and error reports, collected automatically via Sentry to help us find and fix bugs. These reports include a random account ID and username, but never your email address.`,
        ],
      },
      {
        title: '2. How We Use Your Information',
        content: `We use the information above to:`,
        items: [
          `create and secure your account, and let you sign in`,
          `run gameplay — matchmaking, scoring, and leaderboards — and display your profile and stats to other players`,
          `operate classroom features: let teachers create classrooms and lessons, track student progress, generate reports, and (optionally) sync grades to Google Classroom`,
          `send you service email through Resend: account and welcome messages, replies to your contact/feedback messages, and (unless you opt out) occasional re-engagement emails; payment receipts are sent by Polar, our payment processor`,
          `measure and improve LexiClash using analytics, only if you've accepted analytics cookies`,
          `automatically find and fix bugs through crash/error reporting`,
          `show advertising outside of classroom and education pages, only if you've accepted advertising cookies (or, in native apps, in a way that complies with app-store ad policies)`,
          `keep the game fair and enforce our Terms of Service`,
        ],
      },
      {
        title: '3. Third-Party Services',
        content: `We rely on the following processors to run LexiClash. Each only receives the data it needs to perform its role for us:`,
        items: [
          `Supabase — authentication, database, and file storage`,
          `PostHog — product analytics (EU-hosted), only with your consent; when signed in this includes your email, display name, and teacher/admin role`,
          `Google Analytics (GA4) — usage analytics, only with your consent`,
          `Sentry — automatic crash and error reporting`,
          `LogRocket — session replay and error logs, only with your consent; when signed in it also links your session to your display name and gameplay stats`,
          `Google AdMob, and Google's H5 Games Ads on the web version — advertising, only outside classroom/education pages and only with your consent`,
          `ayeT-Studios — an optional "earn coins" offerwall on the web version; never shown to an account flagged as a child`,
          `Resend — sending the emails described above on our behalf`,
          `Polar — payment processing and Merchant of Record for Pro subscriptions`,
          `Google Classroom API — only if a teacher chooses to connect it; see "Google User Data"`,
          `Google and Discord — OAuth sign-in`,
        ],
      },
      {
        title: '4. Third-Party Advertising',
        content: `LexiClash is ad-supported outside of classroom and education use. We never show ads on teacher, student, classroom, or education pages, or during a multiplayer game linked to a classroom.`,
        subsections: [
          {
            title: 'How Advertising Works',
            items: [
              `We use Google AdMob in our native mobile app, and Google's H5 Games Ads on the web version.`,
              `In the native app, before ads are set up we ask for consent through Google's User Messaging Platform where your region requires it (for example the EEA and UK). An account identified as a child (see "Classrooms, Schools, and Children's Privacy" below) sees no ads of any kind there, and any account we haven't confirmed as an adult does not see interstitial ads and is served ads in Google's child-directed and under-age-of-consent modes (TFCD/TFUA), which turn off ad personalization and cap ad content to a general-audience rating.`,
              `On the web, ad requests carry the Google Consent Mode v2 signal from the "Advertising" choice in our cookie banner, which controls whether an ad can be personalized.`,
              `We may also show an optional "earn coins" offerwall (ayeT-Studios) on the web version; it is never shown to an account identified as a child, and never on classroom/education pages.`,
              `We never sell your personal data to advertisers.`,
            ],
          },
          {
            title: 'Your Choices',
            content: `You can control advertising on LexiClash:`,
            items: [
              `change your Advertising cookie choice at any time from our cookie banner`,
              `opt out of personalized advertising in Google Ads Settings (https://adssettings.google.com)`,
              `review Google's advertising privacy practices at https://policies.google.com/technologies/ads`,
              `opt out of other participating vendors' ad cookies at https://www.aboutads.info/choices`,
              `manage or delete cookies in your browser settings — disabling essential cookies may stop the site working properly`,
            ],
          },
        ],
      },
      {
        title: '5. Cookies and Local Storage',
        content: `We use cookies and local storage in three categories, shown in our cookie banner: Essential — always on, needed for sign-in, security, and remembering basic preferences like theme and language; the site may not work properly without them. Analytics — used only if you accept them; powers PostHog, Google Analytics, and LogRocket, as described above. Advertising — used only if you accept them; lets Google serve and measure ads outside classroom/education pages, as described above. You can change your choice at any time from the cookie banner or your browser settings.`,
      },
      {
        title: '6. Google User Data',
        content: `This section brings together, in one place, everything LexiClash does with data it receives from Google's APIs.`,
        subsections: [
          {
            title: 'Google Sign-In',
            content: `When you sign in to your own LexiClash account with Google, Google shares your name, email address, and profile picture with us so we can create and authenticate your account, as described in "Information We Collect" above. We do not request any Google Classroom access as part of this sign-in.`,
          },
          {
            title: 'Google Classroom Integration (optional, Teacher Pro)',
            content: `If a teacher explicitly connects their Google account to send grades to Google Classroom, LexiClash accesses only what that feature needs, and only while the teacher is using it:`,
            items: [
              `Your Google Classroom course list, so you can pick which class to grade.`,
              `That class's roster — each student's Google Classroom user ID and, so we can match them to your LexiClash students, their school email address.`,
              `The coursework/assignment you select or create, and each student's submission status for it.`,
              `We use this only to match a LexiClash student to their Google Classroom account by email, and to write the grade you choose to send (and, if you ask us to, mark the assignment returned to that student).`,
              `Roster data (names, emails, Google user IDs) is held in memory only for the single request that sends grades — it is never written to our database, logged, or included in anything sent back to your browser. Only your own LexiClash student names ever appear in the results you see.`,
              `Grades can only be written to a Classroom assignment that LexiClash itself created — a restriction Google's API enforces, not a choice we made.`,
              `Your Google access token is stored only in an encrypted (AES-256-GCM), httpOnly cookie tied to your LexiClash account, and it expires in about one hour. We do not request or store a Google refresh token, so we never hold a long-lived Google credential for your account.`,
              `We never sell or share this data, and we never use it for advertising or to train AI/ML models.`,
              `You can disconnect LexiClash from your Google account at any time at https://myaccount.google.com/permissions.`,
            ],
          },
          {
            title: 'Google API Services User Data Policy',
            content: `${GOOGLE_LIMITED_USE_CLAUSE} See ${GOOGLE_LIMITED_USE_URL}.`,
          },
        ],
      },
      {
        title: '7. Classrooms, Schools, and Children’s Privacy',
        content: `We ask everyone to declare an age. LexiClash's general, ad-supported product additionally follows our app-store age ratings (13+); our separate classroom/teacher product is designed to be used by students of any school age, under a teacher's or school's supervision:`,
        items: [
          `Everyone is asked, through a neutral one-time screen with no default or suggested answer, to state a birth year. Based on that self-reported (not independently verified) answer, your account is placed in one of three tiers — child (under 13), adult (13 or older), or unknown (not yet answered) — each with different defaults for chat, direct messages, friend requests, and advertising.`,
          `A child-tier account never sees an ad or the "earn coins" offerwall, and is restricted out of freeform chat, direct messages, and friend requests by default; an "unknown" (undeclared) account gets the same conservative social defaults as a precaution.`,
          `Guest students who join a classroom with a join code skip account sign-up entirely — they don't provide a name, email, or any personal information, and receive an anonymous account.`,
          `When a teacher creates a classroom and invites students, the teacher (and their school) is responsible for obtaining any parental or guardian consent required by law for students under 13 — the same "school official" basis commonly used by education-technology providers. LexiClash does not independently verify any student's age in that flow.`,
          `We never sell any user's personal information, including a child's, to third parties for marketing.`,
          `A parent or guardian can contact us at lexiclash.game@gmail.com to review, correct, or delete their child's information.`,
        ],
      },
      {
        title: '8. Data Retention',
        content: `We keep information only as long as it serves the purpose we collected it for:`,
        items: [
          `Account, profile, and classroom data — until you or the classroom's teacher delete it, or you delete your account.`,
          `Game statistics and leaderboard entries — kept to preserve leaderboard integrity, and removed when you delete your account and your account's rows are not blocked by a data-integrity conflict (see the deletion note below).`,
          `Redis session/game state — deleted automatically, typically within an hour of the game ending.`,
          `Google Classroom roster data (names, emails, user IDs) — never stored; held in memory only for the single grade-sync request, as described in "Google User Data".`,
          `Your Google Classroom access token — expires automatically after about an hour; we never store a refresh token.`,
          `Analytics and crash data — retained according to each provider's own policy (PostHog, Google Analytics, Sentry, LogRocket).`,
          `Deleting your account is immediate: we remove your push-notification tokens and any teacher-access request rows tied to your email right away, then delete your login itself, which cascades to your profile and the other tables our database links to it. If a data conflict ever blocks part of that cascade, deletion returns an error instead of silently leaving data behind — contact lexiclash.game@gmail.com and we'll complete it by hand.`,
        ],
      },
      {
        title: '9. Data Security',
        content: `We use industry-standard safeguards: all traffic is encrypted with HTTPS; authentication runs through Supabase's OAuth flows; your database records are stored in Supabase's encrypted infrastructure; your Google Classroom access token is stored only in an AES-256-GCM–encrypted, httpOnly cookie; and multiplayer gameplay uses secure WebSocket connections.`,
      },
      {
        title: '10. Your Rights',
        content: `Depending on where you live, you may have the right to:`,
        items: [
          `access the personal data we hold about you, from your profile page or by contacting us`,
          `correct or update your information at any time`,
          `delete your account and its associated data, immediately, from your account settings`,
          `ask us what data we hold and why, and object to or restrict some uses of it`,
          `receive a copy of your data in a portable format, on request`,
          `To exercise any of these rights, contact us at lexiclash.game@gmail.com.`,
        ],
      },
      {
        title: '11. Payments & Subscriptions',
        content: `When you buy a Pro subscription, our payment processor Polar handles the transaction and acts as the Merchant of Record for LexiClash. We receive your subscription's plan, status, and billing period, but never your full card details — those are handled by Polar and its own payment processors, which also collect and remit applicable taxes. For classroom/teacher accounts, we process the student data you give us to deliver the service, exactly as described in this policy and our Terms of Service.`,
      },
      {
        title: '12. International Users',
        content: `Your data may be transferred to, and stored in, countries other than where you live, including countries with different data-protection laws than your own. By using LexiClash, you consent to that transfer.`,
      },
      {
        title: '13. Changes to This Policy',
        content: `We may update this Privacy Policy from time to time. We'll post any changes on this page with a new effective date. Continuing to use LexiClash after a change means you accept the updated policy.`,
      },
      {
        title: '14. Governing Law',
        content: `This Privacy Policy is governed by the laws of the State of Israel. Any dispute will be resolved in the courts located in Israel.`,
      },
      {
        title: '15. Contact Us',
        content: `Questions about this policy, or about your data? Email us at lexiclash.game@gmail.com and we'll get back to you.`,
      },
    ],
};
