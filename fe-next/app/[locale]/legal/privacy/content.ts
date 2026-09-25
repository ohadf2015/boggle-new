// Privacy Policy content — server-renderable for SEO
//
// This describes ONLY what the code actually does. Every claim here was verified
// against the current implementation (Supabase auth/profiles, PostHog + GA4 +
// Sentry + LogRocket analytics gated behind cookie consent, AdMob/H5 Games Ads
// excluded from teacher/student/classroom/education routes, Resend transactional
// email, Polar as Merchant of Record, the Google Classroom grade-passback
// integration, and the account-delete flow) before being written. Effective
// date: 2026-09-25.

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

const GOOGLE_LIMITED_USE_CLAUSE =
  `LexiClash's use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.`;
const GOOGLE_LIMITED_USE_URL = `https://developers.google.com/terms/api-services-user-data-policy`;

export const contentByLocale: Record<string, PrivacyContent> = {
  en: {
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
          `Technical & analytics data, only with your consent: device/browser type, pages viewed, and in-app events, collected via PostHog, Google Analytics, and LogRocket, as described in "Third-Party Services" and "Cookies and Local Storage".`,
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
          `PostHog — product analytics (EU-hosted), only with your consent`,
          `Google Analytics (GA4) — usage analytics, only with your consent`,
          `Sentry — automatic crash and error reporting`,
          `LogRocket — session replay and error logs, only with your consent`,
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
              `We use Google AdMob in our native mobile app and Google's H5 Games Ads (and, on some platforms, that platform's own ads) on the web version.`,
              `Ads only load after you accept the "Advertising" cookie/consent category; this uses Google's Consent Mode v2 signals.`,
              `For any account we haven't confirmed is an adult, ads are served in Google's child-directed and under-age-of-consent modes (TFCD/TFUA), which turn off ad personalization and cap ad content to a general-audience rating.`,
              `We may also show an optional "earn coins" offerwall (ayeT-Studios) on the web version; it is never shown to an account flagged as a child, and never on classroom/education pages.`,
              `We never sell your personal data to advertisers.`,
            ],
          },
          {
            title: 'Your Choices',
            content: `You can control advertising on LexiClash:`,
            items: [
              `change your Advertising cookie choice at any time from our cookie banner`,
              `opt out of personalized advertising in Google Ads Settings (adssettings.google.com)`,
              `review Google's advertising privacy practices at policies.google.com/technologies/ads`,
              `opt out of other participating vendors' ad cookies at aboutads.info`,
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
              `You can disconnect LexiClash from your Google account at any time at myaccount.google.com/permissions.`,
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
        content: `LexiClash's general, ad-supported product is intended for players age 13 and older, consistent with our app-store age ratings. Our separate classroom/teacher product is designed to be used by students of any school age, under a teacher's or school's supervision:`,
        items: [
          `Guest students who join a classroom with a join code do not provide a name, email, or any personal information — they receive an anonymous account, and we never show them ads or the offerwall.`,
          `When a teacher creates a classroom and invites students, the teacher (and their school) is responsible for obtaining any parental or guardian consent required by law for students under 13 — the same "school official" basis commonly used by education-technology providers. LexiClash does not itself verify each student's age in that flow.`,
          `For accounts outside the classroom flow that we identify as belonging to a user under 14, we keep a parental-consent record (a parent's email, the child's birth year, and when consent was given), as required by GDPR, Israel's Protection of Privacy Law, and Israeli Ministry of Education guidance.`,
          `We never sell any user's personal information, including a child's, to third parties for marketing.`,
          `A parent or guardian can contact us at lexiclash.game@gmail.com to review, correct, or delete their child's information.`,
        ],
      },
      {
        title: '8. Data Retention',
        content: `We keep information only as long as it serves the purpose we collected it for:`,
        items: [
          `Account, profile, and classroom data — until you or the classroom's teacher delete it, or you delete your account.`,
          `Game statistics and leaderboard entries — kept to preserve leaderboard integrity, and removed when you delete your account.`,
          `Redis session/game state — deleted automatically, typically within an hour of the game ending.`,
          `Google Classroom roster data (names, emails, user IDs) — never stored; held in memory only for the single grade-sync request, as described in "Google User Data".`,
          `Your Google Classroom access token — expires automatically after about an hour; we never store a refresh token.`,
          `Analytics and crash data — retained according to each provider's own policy (PostHog, Google Analytics, Sentry, LogRocket).`,
          `Deleting your account is immediate: it permanently removes your account, profile, and push-notification tokens, and cascades to remove classrooms, memberships, and progress records tied to your account.`,
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
  },
  he: {
    title: 'מדיניות פרטיות',
    intro: `מדיניות פרטיות זו מסבירה כיצד LexiClash — המופעלת על ידי אוהד פישר, עצמאי פרטי הפועל מישראל ("אנחנו") — אוספת, משתמשת ומגנה על המידע האישי שלכם בעת השימוש במשחק המילים מרובה המשתתפים ובפלטפורמת הכיתה שלנו בכתובת lexiclash.live. מסמך זה אינו ייעוץ משפטי.`,
    sections: [
      {
        title: '1. המידע שאנחנו אוספים',
        content: `אנחנו אוספים את סוגי המידע הבאים, בהתאם לאופן שבו אתם משתמשים ב-LexiClash:`,
        items: [
          `נתוני חשבון והתחברות: אם אתם מתחברים באמצעות Google או Discord, אנו מקבלים מהספק את שמכם, כתובת האימייל שלכם ותמונת הפרופיל (ראו "מידע ממשתמשי Google" למטה לגבי מה שהתחברות עם Google משתפת בפרט); הטיפול מתבצע דרך Supabase Auth.`,
          `פרופיל שחקן: שם תצוגה, אווטאר (אימוג'י, צבע או תמונה שהעליתם) והעדפות משחק.`,
          `נתוני משחק: ניקוד, מילים שנמצאו, ניצחונות, משחקים ששוחקו, זמן משחק, הישגים ומיקום בטבלאות המובילים.`,
          `נתוני משחק זמניים: מצב החדר/המשחק הנוכחי, המאוחסן ב-Redis ונמחק אוטומטית, בדרך כלל תוך שעה מסיום המשחק.`,
          `נתוני כיתה, אם אתם או בית הספר שלכם משתמשים בכלי המורה שלנו: שמות כיתות, קודי הצטרפות, רשימת התלמידים בכיתה, מטלות שיעור ורשומות תרגול/התקדמות של כל תלמיד עבור שיעורים שהקציתם. תלמידי אורח שמצטרפים באמצעות קוד כיתה אינם מוסרים שם או אימייל — הם מקבלים חשבון אנונימי.`,
          `נתוני סנכרון אופציונליים עם Google Classroom, רק אם מורה מחבר את החשבון: ראו את הסעיף הייעודי "מידע ממשתמשי Google" למטה.`,
          `נתוני תשלום: אם אתם רוכשים מנוי Pro, ספק הסליקה שלנו, Polar, משתף אתנו את תוכנית המנוי, הסטטוס שלו ותקופת החיוב. אנחנו לעולם לא מקבלים או שומרים את מספר הכרטיס המלא.`,
          `הודעות שאתם שולחים לנו: אם אתם משתמשים בטופסי יצירת הקשר או המשוב שלנו, אנו שומרים את ההודעה ואת כתובת האימייל שסיפקתם כדי שנוכל להשיב.`,
          `נתונים טכניים ואנליטיים, רק בהסכמתכם: סוג מכשיר/דפדפן, עמודים שנצפו ואירועים בתוך האפליקציה, הנאספים באמצעות PostHog, Google Analytics ו-LogRocket, כמתואר בסעיפים "שירותי צד שלישי" ו"עוגיות ואחסון מקומי".`,
          `דוחות קריסה ותקלות, הנאספים אוטומטית באמצעות Sentry כדי לעזור לנו לאתר ולתקן באגים. דוחות אלה כוללים מזהה חשבון אקראי ושם משתמש, אך לעולם לא את כתובת האימייל שלכם.`,
        ],
      },
      {
        title: '2. כיצד אנחנו משתמשים במידע שלכם',
        content: `אנחנו משתמשים במידע שלעיל כדי:`,
        items: [
          `ליצור ולאבטח את החשבון שלכם, ולאפשר לכם להתחבר`,
          `להפעיל את המשחק — שיבוץ יריבים, ניקוד וטבלאות מובילים — ולהציג את הפרופיל והסטטיסטיקות שלכם לשחקנים אחרים`,
          `להפעיל את כלי הכיתה: לאפשר למורים ליצור כיתות ושיעורים, לעקוב אחר התקדמות תלמידים, להפיק דוחות ו(באופן אופציונלי) לסנכרן ציונים ל-Google Classroom`,
          `לשלוח לכם אימייל שירותי דרך Resend: הודעות חשבון וברוכים הבאים, תשובות להודעות יצירת הקשר/משוב שלכם, ו(אלא אם תבחרו שלא) אימיילים מדי פעם לעידוד חזרה למשחק; קבלות תשלום נשלחות על ידי Polar, ספק הסליקה שלנו`,
          `למדוד ולשפר את LexiClash באמצעות אנליטיקה, רק אם אישרתם עוגיות אנליטיקה`,
          `לאתר ולתקן באגים אוטומטית, באמצעות דיווח קריסות/שגיאות`,
          `להציג פרסומות מחוץ לעמודי כיתה וחינוך, רק אם אישרתם עוגיות פרסום (או, באפליקציות נייטיב, באופן התואם למדיניות הפרסום של חנויות האפליקציות)`,
          `לשמור על הוגנות המשחק ולאכוף את תנאי השימוש שלנו`,
        ],
      },
      {
        title: '3. שירותי צד שלישי',
        content: `אנחנו נעזרים בספקים הבאים כדי להפעיל את LexiClash. כל אחד מהם מקבל רק את המידע הדרוש לו לתפקידו:`,
        items: [
          `Supabase — אימות, מסד נתונים ואחסון קבצים`,
          `PostHog — אנליטיקת מוצר (מאוחסן באיחוד האירופי), רק בהסכמתכם`,
          `Google Analytics (GA4) — אנליטיקת שימוש, רק בהסכמתכם`,
          `Sentry — דיווח אוטומטי על קריסות ושגיאות`,
          `LogRocket — הקלטת סשן ולוגים של שגיאות, רק בהסכמתכם`,
          `Google AdMob, ו-Google H5 Games Ads בגרסת האינטרנט — פרסום, רק מחוץ לעמודי כיתה/חינוך ורק בהסכמתכם`,
          `ayeT-Studios — "קיר הצעות" אופציונלי להרוויח מטבעות בגרסת האינטרנט; לעולם לא מוצג לחשבון המסומן כילד`,
          `Resend — שליחת האימיילים המתוארים לעיל מטעמנו`,
          `Polar — סליקת תשלומים וסוחר הרישום (Merchant of Record) עבור מנויי Pro`,
          `ממשק Google Classroom API — רק אם מורה בוחר לחבר אותו; ראו "מידע ממשתמשי Google"`,
          `Google ו-Discord — התחברות OAuth`,
        ],
      },
      {
        title: '4. פרסום צד שלישי',
        content: `LexiClash ממומן בחלקו על ידי פרסומות מחוץ לשימוש בכיתה ובחינוך. אנחנו לעולם לא מציגים פרסומות בעמודי מורה, תלמיד, כיתה או חינוך, או במהלך משחק מרובה משתתפים המקושר לכיתה.`,
        subsections: [
          {
            title: 'איך הפרסום עובד',
            items: [
              `אנחנו משתמשים ב-Google AdMob באפליקציית המובייל הנייטיב שלנו וב-Google H5 Games Ads (ובחלק מהפלטפורמות, בפרסומות של הפלטפורמה עצמה) בגרסת האינטרנט.`,
              `פרסומות נטענות רק לאחר שאישרתם את קטגוריית ההסכמה "פרסום"; זה משתמש באותות Consent Mode v2 של Google.`,
              `עבור כל חשבון שלא אימתנו כמבוגר, פרסומות מוצגות במצבי Google המיועדים לילדים ולמתחת לגיל ההסכמה (TFCD/TFUA), המכבים התאמה אישית של פרסומות ומגבילים את תוכן הפרסומות לדירוג כללי.`,
              `אנחנו עשויים להציג גם "קיר הצעות" אופציונלי להרוויח מטבעות (ayeT-Studios) בגרסת האינטרנט; הוא לעולם לא מוצג לחשבון המסומן כילד, ולא מוצג בעמודי כיתה/חינוך.`,
              `אנחנו לעולם לא מוכרים את המידע האישי שלכם למפרסמים.`,
            ],
          },
          {
            title: 'האפשרויות שלכם',
            content: `תוכלו לשלוט בפרסום ב-LexiClash:`,
            items: [
              `לשנות את בחירת עוגיות הפרסום שלכם בכל עת מבאנר העוגיות שלנו`,
              `לצאת מפרסום מותאם אישית ב-Google Ads Settings (adssettings.google.com)`,
              `לעיין במדיניות הפרטיות הפרסומית של Google ב-policies.google.com/technologies/ads`,
              `לצאת מעוגיות פרסום של ספקים משתתפים נוספים ב-aboutads.info`,
              `לנהל או למחוק עוגיות בהגדרות הדפדפן שלכם — השבתת עוגיות חיוניות עלולה למנוע מהאתר לפעול כראוי`,
            ],
          },
        ],
      },
      {
        title: '5. עוגיות ואחסון מקומי',
        content: `אנחנו משתמשים בעוגיות ובאחסון מקומי בשלוש קטגוריות, המוצגות בבאנר העוגיות שלנו: חיוני — פעיל תמיד, נדרש להתחברות, לאבטחה ולזכירת העדפות בסיסיות כמו ערכת נושא ושפה; ייתכן שהאתר לא יפעל כראוי בלעדיו. אנליטיקה — בשימוש רק אם תאשרו; מפעיל את PostHog, Google Analytics ו-LogRocket, כמתואר לעיל. פרסום — בשימוש רק אם תאשרו; מאפשר ל-Google להציג ולמדוד פרסומות מחוץ לעמודי כיתה/חינוך, כמתואר לעיל. תוכלו לשנות את בחירתכם בכל עת מבאנר העוגיות או מהגדרות הדפדפן.`,
      },
      {
        title: '6. מידע ממשתמשי Google',
        content: `סעיף זה מרכז במקום אחד את כל מה ש-LexiClash עושה עם מידע שהיא מקבלת מממשקי Google.`,
        subsections: [
          {
            title: 'התחברות עם Google',
            content: `כאשר אתם מתחברים לחשבון LexiClash שלכם עם Google, Google משתפת אתנו את שמכם, כתובת האימייל שלכם ותמונת הפרופיל שלכם, כדי שנוכל ליצור ולאמת את חשבונכם, כמתואר בסעיף "המידע שאנחנו אוספים" לעיל. אנחנו לא מבקשים כל גישה ל-Google Classroom כחלק מהתחברות זו.`,
          },
          {
            title: 'אינטגרציית Google Classroom (אופציונלי, Teacher Pro)',
            content: `אם מורה מחבר במפורש את חשבון ה-Google שלו כדי לשלוח ציונים ל-Google Classroom, LexiClash ניגשת רק למה שהתכונה הזו צריכה, ורק בזמן שהמורה משתמש בה:`,
            items: [
              `רשימת הקורסים שלכם ב-Google Classroom, כדי שתוכלו לבחור איזו כיתה לדרג.`,
              `רשימת התלמידים של אותה כיתה — מזהה המשתמש של כל תלמיד ב-Google Classroom, וכן, כדי שנוכל להתאים אותם לתלמידי LexiClash שלכם, כתובת האימייל הבית-ספרית שלהם.`,
              `המטלה שבחרתם או יצרתם, וסטטוס ההגשה של כל תלמיד לגביה.`,
              `אנחנו משתמשים בזה רק כדי להתאים תלמיד LexiClash לחשבון Google Classroom שלו לפי אימייל, ולכתוב את הציון שבחרתם לשלוח (ואם תבקשו, לסמן את המטלה כהוחזרה לאותו תלמיד).`,
              `נתוני רשימת התלמידים (שמות, אימיילים, מזהי משתמש של Google) נשמרים בזיכרון רק למשך הבקשה היחידה ששולחת את הציונים — הם לעולם לא נכתבים למסד הנתונים שלנו, לא נרשמים ביומן, ולא נכללים בשום דבר שנשלח בחזרה לדפדפן שלכם. רק שמות התלמידים שלכם מ-LexiClash מופיעים בתוצאות שאתם רואים.`,
              `ניתן לכתוב ציונים רק למטלה ב-Classroom שנוצרה על ידי LexiClash עצמה — זו מגבלה שה-API של Google אוכף, לא בחירה שלנו.`,
              `אסימון הגישה שלכם ל-Google מאוחסן רק בעוגיית httpOnly מוצפנת (AES-256-GCM) המקושרת לחשבון LexiClash שלכם, והוא פג תוקף כעבור כשעה. אנחנו לא מבקשים ולא שומרים refresh token של Google, כך שאנחנו לעולם לא מחזיקים אישור גישה ארוך-טווח לחשבונכם.`,
              `אנחנו לעולם לא מוכרים או משתפים מידע זה, ולעולם לא משתמשים בו לפרסום או לאימון מודלים של בינה מלאכותית.`,
              `תוכלו לנתק את LexiClash מחשבון ה-Google שלכם בכל עת בכתובת myaccount.google.com/permissions.`,
            ],
          },
          {
            title: 'מדיניות נתוני המשתמשים של שירותי ה-API של Google',
            content: `בהתאם לדרישת Google, אנו מציגים כאן את ההצהרה הבאה במקורה, באנגלית: "${GOOGLE_LIMITED_USE_CLAUSE}" למידע נוסף: ${GOOGLE_LIMITED_USE_URL}`,
          },
        ],
      },
      {
        title: '7. כיתות, בתי ספר ופרטיות ילדים',
        content: `המוצר הכללי הממומן בפרסומות של LexiClash מיועד לשחקנים בני 13 ומעלה, בהתאם לדירוגי הגיל שלנו בחנויות האפליקציות. מוצר הכיתה/המורה הנפרד שלנו מיועד לשימוש על ידי תלמידים בכל גיל בית ספר, תחת פיקוח המורה או בית הספר:`,
        items: [
          `תלמידי אורח שמצטרפים לכיתה בקוד הצטרפות אינם מוסרים שם, אימייל או כל מידע אישי — הם מקבלים חשבון אנונימי, ואנחנו לעולם לא מציגים להם פרסומות או את קיר ההצעות.`,
          `כאשר מורה יוצר כיתה ומזמין תלמידים, המורה (ובית הספר שלו) אחראים להשיג כל הסכמת הורה או אפוטרופוס הנדרשת בחוק עבור תלמידים מתחת לגיל 13 — אותו בסיס "גורם מוסמך מטעם בית הספר" הנהוג בקרב ספקי טכנולוגיה חינוכית. LexiClash אינה מאמתת בעצמה את גילו של כל תלמיד בתהליך זה.`,
          `עבור חשבונות מחוץ לתהליך הכיתה שאנו מזהים כשייכים למשתמש מתחת לגיל 14, אנו שומרים רשומת הסכמת הורים (אימייל של ההורה, שנת הלידה של הילד ומועד מתן ההסכמה), כנדרש ב-GDPR, בחוק הגנת הפרטיות הישראלי ובהנחיות משרד החינוך.`,
          `אנחנו לעולם לא מוכרים מידע אישי של אף משתמש, כולל ילד, לצדדים שלישיים לצורכי שיווק.`,
          `הורה או אפוטרופוס יכולים לפנות אלינו בכתובת lexiclash.game@gmail.com כדי לעיין, לתקן או למחוק את המידע של ילדם.`,
        ],
      },
      {
        title: '8. שמירת מידע',
        content: `אנחנו שומרים מידע רק כל עוד הוא משרת את המטרה שלשמה נאסף:`,
        items: [
          `נתוני חשבון, פרופיל וכיתה — עד שאתם או מורה הכיתה מוחקים אותם, או עד שאתם מוחקים את חשבונכם.`,
          `סטטיסטיקות משחק ורשומות בטבלת המובילים — נשמרות כדי לשמר את יושרת טבלת המובילים, ומוסרות כשאתם מוחקים את חשבונכם.`,
          `מצב משחק/סשן ב-Redis — נמחק אוטומטית, בדרך כלל תוך שעה מסיום המשחק.`,
          `נתוני רשימת תלמידים מ-Google Classroom (שמות, אימיילים, מזהי משתמש) — לעולם לא נשמרים; מוחזקים בזיכרון רק למשך בקשת סנכרון הציונים היחידה, כמתואר ב"מידע ממשתמשי Google".`,
          `אסימון הגישה שלכם ל-Google Classroom — פג תוקף אוטומטית כעבור כשעה; אנחנו לעולם לא שומרים refresh token.`,
          `נתוני אנליטיקה וקריסות — נשמרים בהתאם למדיניות של כל ספק (PostHog, Google Analytics, Sentry, LogRocket).`,
          `מחיקת החשבון שלכם היא מיידית: היא מסירה לצמיתות את החשבון, הפרופיל ואסימוני ההתראות שלכם, ומובילה למחיקת כיתות, חברויות ורשומות התקדמות המקושרות לחשבונכם.`,
        ],
      },
      {
        title: '9. אבטחת מידע',
        content: `אנחנו משתמשים באמצעי הגנה בתקן התעשייה: כל התעבורה מוצפנת ב-HTTPS; האימות מתבצע דרך תהליכי ה-OAuth של Supabase; רשומות מסד הנתונים שלכם מאוחסנות בתשתית המוצפנת של Supabase; אסימון הגישה שלכם ל-Google Classroom מאוחסן רק בעוגייה מוצפנת (AES-256-GCM) מסוג httpOnly; ומשחק מרובה משתתפים משתמש בחיבורי WebSocket מאובטחים.`,
      },
      {
        title: '10. הזכויות שלכם',
        content: `בהתאם למקום מגוריכם, ייתכן שתהיה לכם הזכות ל:`,
        items: [
          `לגשת למידע האישי שאנו מחזיקים עליכם, מעמוד הפרופיל שלכם או על ידי פנייה אלינו`,
          `לתקן או לעדכן את המידע שלכם בכל עת`,
          `למחוק את חשבונכם ואת המידע הקשור אליו, מיידית, מהגדרות החשבון שלכם`,
          `לשאול אותנו אילו נתונים אנו מחזיקים ולמה, ולהתנגד או להגביל חלק מהשימושים בהם`,
          `לקבל עותק של המידע שלכם בפורמט נייד, לפי בקשה`,
          `כדי לממש זכות מהזכויות האלה, פנו אלינו בכתובת lexiclash.game@gmail.com.`,
        ],
      },
      {
        title: '11. תשלומים ומנויים',
        content: `כאשר אתם רוכשים מנוי Pro, ספק הסליקה שלנו, Polar, מטפל בעסקה ופועל כסוחר הרישום (Merchant of Record) עבור LexiClash. אנחנו מקבלים את תוכנית המנוי שלכם, הסטטוס ותקופת החיוב שלו, אך לעולם לא את פרטי הכרטיס המלאים — אלה מטופלים על ידי Polar וספקי הסליקה שלה, האחראים גם על גביית מסים רלוונטיים. עבור חשבונות כיתה/מורה, אנו מעבדים את נתוני התלמידים שסיפקתם לנו כדי לספק את השירות, בדיוק כפי שמתואר במדיניות זו ובתנאי השימוש שלנו.`,
      },
      {
        title: '12. משתמשים בינלאומיים',
        content: `המידע שלכם עשוי להיות מועבר ומאוחסן במדינות שאינן מדינת מגוריכם, לרבות מדינות עם חוקי הגנת פרטיות שונים משלכם. השימוש שלכם ב-LexiClash מהווה הסכמה להעברה כזו.`,
      },
      {
        title: '13. שינויים במדיניות זו',
        content: `אנו עשויים לעדכן מדיניות פרטיות זו מעת לעת. כל שינוי יפורסם בעמוד זה עם תאריך כניסה לתוקף מעודכן. המשך השימוש שלכם ב-LexiClash לאחר שינוי כזה מהווה הסכמה למדיניות המעודכנת.`,
      },
      {
        title: '14. דין חל',
        content: `מדיניות פרטיות זו כפופה לחוקי מדינת ישראל. כל מחלוקת תתברר בבתי המשפט הממוקמים בישראל.`,
      },
      {
        title: '15. יצירת קשר',
        content: `יש לכם שאלות לגבי מדיניות זו, או לגבי המידע שלכם? כתבו לנו לכתובת lexiclash.game@gmail.com ואנחנו נחזור אליכם.`,
      },
    ],
  },
  sv: {
    title: 'Integritetspolicy',
    intro: `Den här integritetspolicyn förklarar hur LexiClash – som drivs av Ohad Fisher, en privat enskild näringsidkare baserad i Israel ("vi", "oss") – samlar in, använder och skyddar dina personuppgifter när du använder vårt flerspelar-ordspel och vår klassrumsplattform på lexiclash.live. Det här dokumentet är inte juridisk rådgivning.`,
    sections: [
      {
        title: '1. Information vi samlar in',
        content: `Vi samlar in följande typer av information, beroende på hur du använder LexiClash:`,
        items: [
          `Konto- och inloggningsuppgifter: om du loggar in med Google eller Discord får vi ditt namn, din e-postadress och din profilbild från den tjänsten (se "Google-användardata" nedan för vad Google-inloggning specifikt delar); detta hanteras via Supabase Auth.`,
          `Spelarprofil: ditt visningsnamn, avatar (emoji, färg eller en bild du laddar upp) och dina inställningar.`,
          `Speldata: poäng, hittade ord, vinster, spelade omgångar, speltid, prestationer och placering på topplistor.`,
          `Tillfällig sessionsdata: aktuellt rum-/speltillstånd, lagrat i Redis och raderas automatiskt, vanligtvis inom en timme efter att spelet avslutats.`,
          `Klassrumsdata, om du eller din skola använder våra lärarverktyg: klassrumsnamn, anslutningskoder, listan över elever i ett klassrum, tilldelade lektioner och varje elevs övnings-/framstegsdata för de lektioner du tilldelar. Gästelever som ansluter med en klasskod uppger varken namn eller e-post – de får ett anonymt konto.`,
          `Valfri synkroniseringsdata för Google Classroom, endast om en lärare ansluter den: se avsnittet "Google-användardata" nedan.`,
          `Betalningsdata: om du prenumererar på Pro delar vår betalningsleverantör Polar din prenumerationsplan, status och faktureringsperiod med oss. Vi tar aldrig emot eller lagrar ditt fullständiga kortnummer.`,
          `Meddelanden du skickar till oss: om du använder vårt kontakt- eller feedbackformulär sparar vi meddelandet och den e-postadress du uppgav så att vi kan svara.`,
          `Teknisk data och analysdata, endast med ditt samtycke: enhets-/webbläsartyp, visade sidor och händelser i appen, som samlas in via PostHog, Google Analytics och LogRocket enligt beskrivningen i "Tredjepartstjänster" och "Cookies och lokal lagring".`,
          `Kraschrapporter och felrapporter, som samlas in automatiskt via Sentry för att hjälpa oss hitta och åtgärda buggar. Dessa rapporter innehåller ett slumpmässigt konto-id och användarnamn, men aldrig din e-postadress.`,
        ],
      },
      {
        title: '2. Hur vi använder din information',
        content: `Vi använder informationen ovan för att:`,
        items: [
          `skapa och skydda ditt konto, och låta dig logga in`,
          `driva spelet – matchning, poängsättning och topplistor – och visa din profil och statistik för andra spelare`,
          `driva klassrumsfunktionerna: låta lärare skapa klassrum och lektioner, följa elevers framsteg, generera rapporter och (valfritt) synkronisera betyg till Google Classroom`,
          `skicka tjänsterelaterad e-post via Resend: konto- och välkomstmeddelanden, svar på dina kontakt-/feedbackmeddelanden och (om du inte har valt bort det) enstaka återengagemangs-e-post; betalningskvitton skickas av Polar, vår betalningsleverantör`,
          `mäta och förbättra LexiClash med hjälp av analys, endast om du har godkänt analys-cookies`,
          `automatiskt hitta och åtgärda buggar genom krasch-/felrapportering`,
          `visa annonser utanför klassrums- och utbildningssidor, endast om du har godkänt annons-cookies (eller, i native-appar, på ett sätt som följer app-butikernas annonspolicyer)`,
          `hålla spelet rättvist och upprätthålla våra användarvillkor`,
        ],
      },
      {
        title: '3. Tredjepartstjänster',
        content: `Vi förlitar oss på följande leverantörer för att driva LexiClash. Var och en får bara den data de behöver för sin roll åt oss:`,
        items: [
          `Supabase – autentisering, databas och fillagring`,
          `PostHog – produktanalys (EU-hostad), endast med ditt samtycke`,
          `Google Analytics (GA4) – användningsanalys, endast med ditt samtycke`,
          `Sentry – automatisk krasch- och felrapportering`,
          `LogRocket – sessionsinspelning och felloggar, endast med ditt samtycke`,
          `Google AdMob, och Googles H5 Games Ads på webbversionen – annonsering, endast utanför klassrums-/utbildningssidor och endast med ditt samtycke`,
          `ayeT-Studios – en valfri "tjäna mynt"-erbjudandevägg på webbversionen; visas aldrig för ett konto flaggat som barn`,
          `Resend – att skicka ovanstående e-post å våra vägnar`,
          `Polar – betalningshantering och Merchant of Record för Pro-prenumerationer`,
          `Google Classroom API – endast om en lärare väljer att ansluta det; se "Google-användardata"`,
          `Google och Discord – OAuth-inloggning`,
        ],
      },
      {
        title: '4. Annonsering från tredje part',
        content: `LexiClash finansieras delvis av annonser utanför klassrums- och utbildningsanvändning. Vi visar aldrig annonser på lärar-, elev-, klassrums- eller utbildningssidor, eller under en flerspelaromgång kopplad till ett klassrum.`,
        subsections: [
          {
            title: 'Så fungerar annonseringen',
            items: [
              `Vi använder Google AdMob i vår native mobilapp och Googles H5 Games Ads (och, på vissa plattformar, den plattformens egna annonser) på webbversionen.`,
              `Annonser laddas endast efter att du godkänt kategorin "Annonsering" i vårt samtycke; detta använder Googles Consent Mode v2-signaler.`,
              `För konton vi inte har bekräftat är vuxna visas annonser i Googles barnriktade och under-samtyckesålder-lägen (TFCD/TFUA), vilket stänger av personanpassade annonser och begränsar annonsinnehållet till en allmän åldersgräns.`,
              `Vi kan även visa en valfri "tjäna mynt"-erbjudandevägg (ayeT-Studios) på webbversionen; den visas aldrig för ett konto flaggat som barn, och inte på klassrums-/utbildningssidor.`,
              `Vi säljer aldrig dina personuppgifter till annonsörer.`,
            ],
          },
          {
            title: 'Dina val',
            content: `Du kan styra annonseringen i LexiClash:`,
            items: [
              `ändra ditt val för annons-cookies när som helst från vår cookie-banner`,
              `avaktivera personanpassade annonser i Google Ads-inställningar (adssettings.google.com)`,
              `läsa om Googles annonsrelaterade integritetspraxis på policies.google.com/technologies/ads`,
              `avaktivera andra deltagande leverantörers annons-cookies på aboutads.info`,
              `hantera eller ta bort cookies i din webbläsares inställningar – att stänga av nödvändiga cookies kan hindra webbplatsen från att fungera korrekt`,
            ],
          },
        ],
      },
      {
        title: '5. Cookies och lokal lagring',
        content: `Vi använder cookies och lokal lagring i tre kategorier, som visas i vår cookie-banner: Nödvändiga – alltid aktiva, krävs för inloggning, säkerhet och att komma ihåg grundläggande inställningar som tema och språk; webbplatsen kanske inte fungerar utan dem. Analys – används endast om du godkänner dem; driver PostHog, Google Analytics och LogRocket, enligt ovan. Annonsering – används endast om du godkänner dem; låter Google visa och mäta annonser utanför klassrums-/utbildningssidor, enligt ovan. Du kan ändra ditt val när som helst från cookie-bannern eller din webbläsares inställningar.`,
      },
      {
        title: '6. Google-användardata',
        content: `Det här avsnittet samlar på ett ställe allt LexiClash gör med data som tas emot från Googles API:er.`,
        subsections: [
          {
            title: 'Google-inloggning',
            content: `När du loggar in på ditt eget LexiClash-konto med Google delar Google ditt namn, din e-postadress och din profilbild med oss så att vi kan skapa och autentisera ditt konto, enligt beskrivningen i "Information vi samlar in" ovan. Vi begär ingen åtkomst till Google Classroom som en del av den här inloggningen.`,
          },
          {
            title: 'Google Classroom-integration (valfri, Teacher Pro)',
            content: `Om en lärare uttryckligen ansluter sitt Google-konto för att skicka betyg till Google Classroom kommer LexiClash bara åt det funktionen behöver, och bara medan läraren använder den:`,
            items: [
              `Din kurslista i Google Classroom, så att du kan välja vilken klass som ska betygsättas.`,
              `Den klassens elevlista – varje elevs Google Classroom-användar-id och, för att vi ska kunna matcha dem mot dina LexiClash-elever, deras skol-e-postadress.`,
              `Uppgiften du väljer eller skapar, och varje elevs inlämningsstatus för den.`,
              `Vi använder detta enbart för att matcha en LexiClash-elev mot deras Google Classroom-konto via e-post, och för att skriva det betyg du väljer att skicka (och, om du ber oss, markera uppgiften som returnerad till den eleven).`,
              `Elevlistedatan (namn, e-post, Google-användar-id) hålls endast i minnet under den enskilda begäran som skickar betygen – den skrivs aldrig till vår databas, loggas inte, och ingår inte i något som skickas tillbaka till din webbläsare. Endast dina egna LexiClash-elevnamn visas i resultaten du ser.`,
              `Betyg kan bara skrivas till en Classroom-uppgift som LexiClash själv skapat – det är en begränsning Googles API upprätthåller, inte ett val vi gjort.`,
              `Din Google-åtkomsttoken lagras endast i en krypterad (AES-256-GCM), httpOnly-cookie kopplad till ditt LexiClash-konto, och den upphör att gälla efter ungefär en timme. Vi begär eller lagrar ingen Google-refreshtoken, så vi har aldrig ett långlivat Google-tillstånd för ditt konto.`,
              `Vi säljer eller delar aldrig den här datan, och använder den aldrig för annonsering eller för att träna AI/ML-modeller.`,
              `Du kan koppla bort LexiClash från ditt Google-konto när som helst på myaccount.google.com/permissions.`,
            ],
          },
          {
            title: 'Googles användardatapolicy för API-tjänster',
            content: `Som Google kräver återger vi här följande förklaring i originalspråket, engelska: "${GOOGLE_LIMITED_USE_CLAUSE}" Mer information: ${GOOGLE_LIMITED_USE_URL}`,
          },
        ],
      },
      {
        title: '7. Klassrum, skolor och barns integritet',
        content: `LexiClashs allmänna, annonsfinansierade produkt riktar sig till spelare 13 år och äldre, i linje med våra åldersgränser i app-butikerna. Vår separata klassrums-/lärarprodukt är utformad för att användas av elever i alla skolåldrar, under en lärares eller skolas tillsyn:`,
        items: [
          `Gästelever som ansluter till ett klassrum med en anslutningskod uppger inte namn, e-post eller någon personlig information – de får ett anonymt konto, och vi visar dem aldrig annonser eller erbjudandeväggen.`,
          `När en lärare skapar ett klassrum och bjuder in elever ansvarar läraren (och skolan) för att inhämta det föräldra- eller vårdnadshavarsamtycke som krävs enligt lag för elever under 13 år – samma "skolansvarig"-grund som ofta används av leverantörer av utbildningsteknik. LexiClash verifierar inte själv varje elevs ålder i det flödet.`,
          `För konton utanför klassrumsflödet som vi identifierar som tillhörande en användare under 14 år för vi ett samtyckesregister (en förälders e-post, barnets födelseår och när samtycke gavs), i enlighet med GDPR, Israels integritetsskyddslag och riktlinjer från Israels utbildningsministerium.`,
          `Vi säljer aldrig någon användares personuppgifter, inklusive ett barns, till tredje part för marknadsföring.`,
          `En förälder eller vårdnadshavare kan kontakta oss på lexiclash.game@gmail.com för att granska, rätta eller radera sitt barns information.`,
        ],
      },
      {
        title: '8. Datalagring',
        content: `Vi behåller information bara så länge den tjänar det syfte den samlades in för:`,
        items: [
          `Konto-, profil- och klassrumsdata – tills du eller klassrummets lärare raderar den, eller du raderar ditt konto.`,
          `Spelstatistik och topplisteposter – behålls för att bevara topplistornas integritet, och tas bort när du raderar ditt konto.`,
          `Redis sessions-/speltillstånd – raderas automatiskt, vanligtvis inom en timme efter att spelet avslutats.`,
          `Elevlistedata från Google Classroom (namn, e-post, användar-id) – lagras aldrig; hålls endast i minnet under den enskilda betygssynkroniseringsbegäran, enligt "Google-användardata".`,
          `Din Google Classroom-åtkomsttoken – upphör automatiskt efter ungefär en timme; vi lagrar aldrig en refreshtoken.`,
          `Analys- och kraschdata – behålls enligt varje leverantörs egen policy (PostHog, Google Analytics, Sentry, LogRocket).`,
          `Att radera ditt konto sker omedelbart: det tar permanent bort ditt konto, din profil och dina push-notistokens, och leder till att klassrum, medlemskap och framstegsdata kopplade till ditt konto också tas bort.`,
        ],
      },
      {
        title: '9. Datasäkerhet',
        content: `Vi använder branschstandardiserade skyddsåtgärder: all trafik krypteras med HTTPS; autentisering sker via Supabases OAuth-flöden; dina databasposter lagras i Supabases krypterade infrastruktur; din Google Classroom-åtkomsttoken lagras endast i en AES-256-GCM-krypterad, httpOnly-cookie; och flerspelarläge använder säkra WebSocket-anslutningar.`,
      },
      {
        title: '10. Dina rättigheter',
        content: `Beroende på var du bor kan du ha rätt att:`,
        items: [
          `få tillgång till de personuppgifter vi har om dig, via din profilsida eller genom att kontakta oss`,
          `rätta eller uppdatera din information när som helst`,
          `radera ditt konto och tillhörande data, omedelbart, från dina kontoinställningar`,
          `fråga oss vilka uppgifter vi har och varför, och invända mot eller begränsa vissa användningar av dem`,
          `på begäran få en kopia av din data i ett portabelt format`,
          `För att utöva någon av dessa rättigheter, kontakta oss på lexiclash.game@gmail.com.`,
        ],
      },
      {
        title: '11. Betalningar och prenumerationer',
        content: `När du köper en Pro-prenumeration hanterar vår betalningsleverantör Polar transaktionen och agerar som Merchant of Record för LexiClash. Vi tar emot din prenumerationsplan, status och faktureringsperiod, men aldrig dina fullständiga kortuppgifter – dessa hanteras av Polar och dess egna betalningsleverantörer, som också samlar in och betalar tillämpliga skatter. För klassrums-/lärarkonton behandlar vi den elevdata du ger oss för att leverera tjänsten, precis som beskrivs i den här policyn och våra användarvillkor.`,
      },
      {
        title: '12. Internationella användare',
        content: `Din data kan överföras till och lagras i andra länder än där du bor, inklusive länder med andra dataskyddslagar än dina egna. Genom att använda LexiClash samtycker du till en sådan överföring.`,
      },
      {
        title: '13. Ändringar av den här policyn',
        content: `Vi kan uppdatera den här integritetspolicyn då och då. Eventuella ändringar publiceras på den här sidan med ett nytt gällande-från-datum. Om du fortsätter använda LexiClash efter en ändring innebär det att du accepterar den uppdaterade policyn.`,
      },
      {
        title: '14. Tillämplig lag',
        content: `Den här integritetspolicyn styrs av lagarna i Staten Israel. Eventuella tvister ska lösas i domstolar belägna i Israel.`,
      },
      {
        title: '15. Kontakta oss',
        content: `Har du frågor om den här policyn, eller om din data? Mejla oss på lexiclash.game@gmail.com så återkommer vi till dig.`,
      },
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    intro: `本プライバシーポリシーは、イスラエルを拠点とする個人事業主Ohad Fisher(以下「当社」)が運営するLexiClashが、lexiclash.liveで提供するマルチプレイヤー単語ゲームおよびクラスルームプラットフォームをご利用いただく際に、お客様の個人情報をどのように収集、利用、保護するかを説明するものです。本書は法的助言を構成するものではありません。`,
    sections: [
      {
        title: '1. 収集する情報',
        content: `LexiClashのご利用方法に応じて、以下の種類の情報を収集します。`,
        items: [
          `アカウント・ログイン情報: GoogleまたはDiscordでログインする場合、当該サービスからお客様の氏名、メールアドレス、プロフィール画像を受け取ります(Googleログインが具体的に共有する情報については下記「Googleユーザーデータ」をご覧ください)。処理はSupabase Auth経由で行われます。`,
          `プレイヤープロフィール: 表示名、アバター(絵文字、色、またはアップロードした画像)、ゲーム設定。`,
          `ゲームデータ: スコア、発見した単語、勝利数、プレイ回数、プレイ時間、実績、リーダーボードの順位。`,
          `一時的なセッションデータ: 現在のルーム/ゲームの状態。Redisに保存され、通常はゲーム終了後1時間以内に自動的に削除されます。`,
          `クラスルームデータ(お客様または学校が教師向けツールを利用する場合): クラスルーム名、参加コード、クラスルーム内の生徒リスト、割り当てたレッスン、各生徒の練習・進捗記録。参加コードでクラスルームに参加するゲスト生徒は氏名やメールアドレスを提供せず、匿名アカウントを取得します。`,
          `任意のGoogle Classroom連携データ(教師が接続した場合のみ): 下記の専用セクション「Googleユーザーデータ」をご覧ください。`,
          `支払いデータ: Proプランをご購読いただく場合、決済処理事業者であるPolarがサブスクリプションのプラン、状況、請求期間を当社と共有します。カード番号の全体を受け取ったり保存したりすることはありません。`,
          `お問い合わせ内容: お問い合わせフォームやフィードバックフォームをご利用いただいた場合、返信のためにメッセージとご提供いただいたメールアドレスを保存します。`,
          `技術情報・分析データ(同意がある場合のみ): デバイス/ブラウザの種類、閲覧ページ、アプリ内イベント。PostHog、Google Analytics、LogRocketにより収集されます(「第三者サービス」および「Cookieとローカルストレージ」参照)。`,
          `クラッシュ・エラーレポート: Sentryにより自動的に収集され、不具合の発見・修正に役立てます。これらのレポートにはランダムなアカウントIDとユーザー名が含まれますが、メールアドレスが含まれることはありません。`,
        ],
      },
      {
        title: '2. 情報の利用目的',
        content: `上記の情報は以下の目的で利用します。`,
        items: [
          `アカウントの作成・保護、ログインの実現`,
          `ゲームの運営(マッチング、スコアリング、リーダーボード)、他のプレイヤーへのプロフィール・統計情報の表示`,
          `クラスルーム機能の運営: 教師によるクラスルーム・レッスンの作成、生徒の進捗管理、レポートの作成、および(任意で)Google Classroomへの成績同期`,
          `Resend経由でのサービス関連メールの送信: アカウント・ウェルカムメール、お問い合わせ・フィードバックへの返信、(オプトアウトされない限り)再エンゲージメントメール。決済領収書は決済処理事業者であるPolarから送信されます`,
          `分析Cookieに同意いただいた場合のみ、分析を用いたLexiClashの測定・改善`,
          `クラッシュ・エラーレポートによる不具合の自動的な発見・修正`,
          `クラスルーム・教育関連ページ以外での広告表示(広告Cookieに同意いただいた場合、またはネイティブアプリではアプリストアの広告ポリシーに準拠する形で)`,
          `ゲームの公平性の維持、利用規約の履行`,
        ],
      },
      {
        title: '3. 第三者サービス',
        content: `LexiClashの運営にあたり、以下の委託先を利用しています。各社には、当社のために必要な範囲の情報のみを提供します。`,
        items: [
          `Supabase — 認証、データベース、ファイルストレージ`,
          `PostHog — プロダクト分析(EUホスティング)、同意がある場合のみ`,
          `Google Analytics(GA4)— 利用状況分析、同意がある場合のみ`,
          `Sentry — クラッシュ・エラーの自動レポート`,
          `LogRocket — セッション再生・エラーログ、同意がある場合のみ`,
          `Google AdMob、およびウェブ版のGoogle H5 Games Ads — 広告(クラスルーム・教育ページ以外、かつ同意がある場合のみ)`,
          `ayeT-Studios — ウェブ版の任意の「コイン獲得」オファーウォール。子どもとしてフラグ付けされたアカウントには表示されません`,
          `Resend — 上記メールの当社に代わる送信`,
          `Polar — Proサブスクリプションの決済処理およびMerchant of Record(販売者)`,
          `Google Classroom API — 教師が接続を選択した場合のみ。「Googleユーザーデータ」参照`,
          `GoogleおよびDiscord — OAuthログイン`,
        ],
      },
      {
        title: '4. 第三者広告',
        content: `LexiClashは、クラスルームおよび教育目的での利用以外では広告収入によって一部運営されています。教師、生徒、クラスルーム、教育関連ページ、またはクラスルームに紐づくマルチプレイヤーの対戦中には、広告を一切表示しません。`,
        subsections: [
          {
            title: '広告の仕組み',
            items: [
              `ネイティブモバイルアプリではGoogle AdMobを、ウェブ版ではGoogle H5 Games Ads(一部プラットフォームではそのプラットフォーム自体の広告)を使用しています。`,
              `広告は、Cookie同意の「広告」カテゴリーに同意いただいた後にのみ読み込まれます。これにはGoogleのConsent Mode v2の信号が使用されます。`,
              `成人であることを確認できていないアカウントについては、Googleの児童対象・同意年齢未満向けモード(TFCD/TFUA)で広告を配信し、パーソナライズ広告を無効化し、広告コンテンツを一般向けの評価に制限します。`,
              `ウェブ版では、任意の「コイン獲得」オファーウォール(ayeT-Studios)を表示する場合があります。子どもとしてフラグ付けされたアカウントには表示されず、クラスルーム・教育ページにも表示されません。`,
              `お客様の個人情報を広告主に販売することはありません。`,
            ],
          },
          {
            title: 'お客様の選択肢',
            content: `LexiClashにおける広告は以下の方法でコントロールできます。`,
            items: [
              `Cookieバナーからいつでも「広告」Cookieの選択を変更する`,
              `Google広告設定(adssettings.google.com)でパーソナライズ広告をオプトアウトする`,
              `policies.google.com/technologies/adsでGoogleの広告に関するプライバシー方針を確認する`,
              `aboutads.infoで他の参加ベンダーの広告Cookieをオプトアウトする`,
              `ブラウザの設定でCookieを管理・削除する(必須Cookieを無効にすると、サイトが正常に動作しない場合があります)`,
            ],
          },
        ],
      },
      {
        title: '5. Cookieとローカルストレージ',
        content: `当社はCookieバナーに表示される3つのカテゴリーでCookieおよびローカルストレージを使用しています。必須 — 常に有効。ログイン、セキュリティ、テーマや言語などの基本設定の記憶に必要であり、これがないとサイトが正常に動作しない場合があります。分析 — 同意いただいた場合のみ使用。上記のとおりPostHog、Google Analytics、LogRocketを稼働させます。広告 — 同意いただいた場合のみ使用。上記のとおりクラスルーム・教育ページ以外でGoogleが広告を配信・測定できるようにします。選択はいつでもCookieバナーまたはブラウザ設定から変更できます。`,
      },
      {
        title: '6. Googleユーザーデータ',
        content: `本セクションでは、LexiClashがGoogleのAPIから受け取るデータについて行うすべての取り扱いを一箇所にまとめています。`,
        subsections: [
          {
            title: 'Googleログイン',
            content: `お客様がご自身のLexiClashアカウントにGoogleでログインすると、Googleは氏名、メールアドレス、プロフィール画像を当社と共有し、上記「収集する情報」のとおりアカウントの作成・認証に利用します。このログインの一環としてGoogle Classroomへのアクセスを要求することはありません。`,
          },
          {
            title: 'Google Classroom連携(任意、Teacher Pro)',
            content: `教師が明示的にGoogleアカウントを接続し、Google Classroomへ成績を送信する場合、LexiClashはこの機能に必要な範囲のみに、かつ教師が利用している間のみアクセスします。`,
            items: [
              `採点するクラスを選択するための、Google Classroomのコース一覧。`,
              `そのクラスの生徒名簿 — 各生徒のGoogle ClassroomユーザーID、およびLexiClashの生徒と照合するための学校のメールアドレス。`,
              `選択または作成した課題、および各生徒の提出状況。`,
              `これらは、LexiClashの生徒をメールアドレスによってGoogle Classroomアカウントと照合し、教師が選択した成績を書き込む(および依頼があれば当該生徒への課題返却をマークする)ためだけに使用します。`,
              `名簿データ(氏名、メールアドレス、GoogleユーザーID)は、成績送信の単一のリクエスト中のみメモリ上に保持され、当社のデータベースに書き込まれることも、ログに記録されることも、ブラウザに返される内容に含まれることもありません。表示される結果には、お客様自身のLexiClashの生徒名のみが表示されます。`,
              `成績はLexiClash自身が作成したClassroomの課題にのみ書き込むことができます。これは当社の選択ではなく、GoogleのAPIによる制約です。`,
              `Googleのアクセストークンは、お客様のLexiClashアカウントに紐づく、暗号化(AES-256-GCM)されたhttpOnly Cookieにのみ保存され、約1時間で失効します。Googleのリフレッシュトークンを要求・保存することはないため、お客様のアカウントに対する長期的なGoogleの認証情報を保持することはありません。`,
              `このデータを販売・共有することはなく、広告目的やAI/機械学習モデルの学習に利用することもありません。`,
              `myaccount.google.com/permissionsから、いつでもLexiClashとGoogleアカウントの連携を解除できます。`,
            ],
          },
          {
            title: 'Google APIサービスのユーザーデータポリシー',
            content: `Googleの要件に従い、以下の記載を原文の英語のまま掲載します。「${GOOGLE_LIMITED_USE_CLAUSE}」詳細: ${GOOGLE_LIMITED_USE_URL}`,
          },
        ],
      },
      {
        title: '7. クラスルーム、学校、および児童のプライバシー',
        content: `LexiClashの一般向け・広告収益モデルの製品は、アプリストアの年齢レーティングに沿って13歳以上のプレイヤーを対象としています。当社の別個のクラスルーム・教師向け製品は、教師または学校の監督のもと、あらゆる学齢の生徒による利用を想定しています。`,
        items: [
          `参加コードでクラスルームに参加するゲスト生徒は、氏名・メールアドレス・その他の個人情報を一切提供しません。匿名アカウントが付与され、広告やオファーウォールが表示されることもありません。`,
          `教師がクラスルームを作成し生徒を招待する場合、13歳未満の生徒について法律上必要となる保護者・後見人の同意を取得する責任は、教師(および学校)にあります。これは教育テクノロジー事業者が一般的に採用する「学校職員」を根拠とする取り扱いと同様です。LexiClash自体が当該フローで各生徒の年齢を確認することはありません。`,
          `クラスルームのフロー以外で14歳未満と判断されるアカウントについては、GDPR、イスラエルのプライバシー保護法、およびイスラエル教育省のガイドラインに従い、保護者の同意記録(保護者のメールアドレス、子どもの生年、同意日時)を保持します。`,
          `子どもを含むいかなるユーザーの個人情報も、マーケティング目的で第三者に販売することはありません。`,
          `保護者または後見人の方は、lexiclash.game@gmail.comまでご連絡いただくことで、お子様の情報の確認、修正、削除を行うことができます。`,
        ],
      },
      {
        title: '8. データの保存期間',
        content: `情報は、収集した目的を果たすために必要な期間のみ保持します。`,
        items: [
          `アカウント、プロフィール、クラスルームのデータ — お客様またはクラスルームの教師が削除するか、お客様がアカウントを削除するまで。`,
          `ゲーム統計・リーダーボードの記録 — リーダーボードの公正性を保つために保持し、アカウント削除時に削除されます。`,
          `Redis上のセッション/ゲーム状態 — 通常はゲーム終了後1時間以内に自動的に削除されます。`,
          `Google Classroomの名簿データ(氏名、メールアドレス、ユーザーID)— 保存されることはなく、「Googleユーザーデータ」に記載のとおり、成績同期の単一リクエスト中のみメモリ上に保持されます。`,
          `Google Classroomのアクセストークン — 約1時間で自動的に失効します。リフレッシュトークンを保存することはありません。`,
          `分析・クラッシュデータ — 各事業者(PostHog、Google Analytics、Sentry、LogRocket)自身のポリシーに従って保持されます。`,
          `アカウントの削除は即時に行われます。アカウント、プロフィール、プッシュ通知トークンが完全に削除され、それに伴い、お客様のアカウントに紐づくクラスルーム、メンバーシップ、進捗記録も削除されます。`,
        ],
      },
      {
        title: '9. データセキュリティ',
        content: `当社は業界標準のセキュリティ対策を実施しています。すべての通信はHTTPSで暗号化され、認証はSupabaseのOAuthフローを通じて行われ、データベースの記録はSupabaseの暗号化されたインフラストラクチャに保存され、Google Classroomのアクセストークンは暗号化(AES-256-GCM)されたhttpOnly Cookieにのみ保存され、マルチプレイヤーゲームプレイは安全なWebSocket接続を使用します。`,
      },
      {
        title: '10. お客様の権利',
        content: `お住まいの地域によっては、以下の権利を有する場合があります。`,
        items: [
          `プロフィールページから、または当社にお問い合わせいただくことで、当社が保有するお客様の個人情報にアクセスする権利`,
          `いつでも情報を訂正または更新する権利`,
          `アカウント設定から、アカウントおよび関連データを即時に削除する権利`,
          `当社が保有するデータの内容とその理由を尋ね、一部の利用について異議を唱えたり制限したりする権利`,
          `ご要望に応じて、データの写しをポータブルな形式で受け取る権利`,
          `これらの権利を行使するには、lexiclash.game@gmail.comまでご連絡ください。`,
        ],
      },
      {
        title: '11. 支払いとサブスクリプション',
        content: `Proサブスクリプションをご購入いただく際、決済処理事業者であるPolarが取引を処理し、LexiClashのMerchant of Record(販売者)として機能します。当社はサブスクリプションのプラン、状況、請求期間を受け取りますが、カードの詳細情報を受け取ることはありません。これらはPolarおよびその決済処理事業者が取り扱い、適用される税金の徴収・納付も行います。クラスルーム・教師アカウントについては、本ポリシーおよび利用規約に記載のとおり、サービス提供のためにお客様からご提供いただいた生徒データを処理します。`,
      },
      {
        title: '12. 国際的なユーザー',
        content: `お客様のデータは、お客様の居住国とは異なるデータ保護法を有する国を含め、居住国以外の国へ移転・保存される場合があります。LexiClashをご利用いただくことにより、お客様はかかる移転に同意したものとみなされます。`,
      },
      {
        title: '13. 本ポリシーの変更',
        content: `当社は、本プライバシーポリシーを随時更新することがあります。変更がある場合は、新しい施行日とともに本ページに掲載します。変更後もLexiClashのご利用を継続された場合、更新後のポリシーに同意されたものとみなされます。`,
      },
      {
        title: '14. 準拠法',
        content: `本プライバシーポリシーはイスラエル国の法律に準拠します。紛争が生じた場合は、イスラエル国内の裁判所で解決されるものとします。`,
      },
      {
        title: '15. お問い合わせ',
        content: `本ポリシーやお客様のデータについてご質問がある場合は、lexiclash.game@gmail.comまでメールでお問い合わせください。折り返しご連絡いたします。`,
      },
    ],
  },
  es: {
    title: 'Política de Privacidad',
    intro: `Esta Política de Privacidad explica cómo LexiClash —operada por Ohad Fisher, autónomo individual con sede en Israel ("nosotros")— recopila, usa y protege tu información personal cuando usas nuestro juego de palabras multijugador y nuestra plataforma para aulas en lexiclash.live. Este documento no constituye asesoramiento legal.`,
    sections: [
      {
        title: '1. Información que recopilamos',
        content: `Recopilamos los siguientes tipos de información, según cómo uses LexiClash:`,
        items: [
          `Datos de cuenta e inicio de sesión: si inicias sesión con Google o Discord, recibimos de ese proveedor tu nombre, tu dirección de correo electrónico y tu foto de perfil (consulta "Datos de usuario de Google" más abajo para lo que comparte específicamente el inicio de sesión con Google); esto se gestiona a través de Supabase Auth.`,
          `Perfil de jugador: tu nombre visible, tu avatar (emoji, color o una imagen que subas) y tus preferencias de juego.`,
          `Datos de partida: puntuaciones, palabras encontradas, victorias, partidas jugadas, tiempo de juego, logros y posición en las clasificaciones.`,
          `Datos de sesión temporales: el estado actual de la sala o partida, guardado en Redis y eliminado automáticamente, normalmente dentro de la hora siguiente a que termine la partida.`,
          `Datos de aula, si tú o tu centro educativo usáis nuestras herramientas para docentes: nombres de aulas, códigos de acceso, la lista de alumnos de un aula, las lecciones asignadas y los registros de práctica/progreso de cada alumno en esas lecciones. Los alumnos invitados que se unen con un código de aula no proporcionan nombre ni correo: reciben una cuenta anónima.`,
          `Datos opcionales de sincronización con Google Classroom, solo si un docente la conecta: consulta la sección dedicada "Datos de usuario de Google" más abajo.`,
          `Datos de pago: si te suscribes a Pro, nuestro procesador de pagos, Polar, comparte con nosotros el plan de suscripción, su estado y el período de facturación. Nunca recibimos ni almacenamos el número completo de tu tarjeta.`,
          `Mensajes que nos envías: si usas nuestros formularios de contacto o comentarios, guardamos el mensaje y la dirección de correo que nos proporcionaste para poder responderte.`,
          `Datos técnicos y analíticos, solo con tu consentimiento: tipo de dispositivo/navegador, páginas vistas y eventos dentro de la app, recopilados mediante PostHog, Google Analytics y LogRocket, como se describe en "Servicios de terceros" y "Cookies y almacenamiento local".`,
          `Informes de errores y fallos, recopilados automáticamente mediante Sentry para ayudarnos a encontrar y corregir errores. Estos informes incluyen un identificador de cuenta aleatorio y un nombre de usuario, pero nunca tu dirección de correo.`,
        ],
      },
      {
        title: '2. Cómo usamos tu información',
        content: `Usamos la información anterior para:`,
        items: [
          `crear y proteger tu cuenta, y permitirte iniciar sesión`,
          `hacer funcionar el juego —emparejamiento, puntuación y clasificaciones— y mostrar tu perfil y estadísticas a otros jugadores`,
          `operar las funciones de aula: permitir que los docentes creen aulas y lecciones, hagan seguimiento del progreso del alumnado, generen informes y (opcionalmente) sincronicen calificaciones con Google Classroom`,
          `enviarte correos relacionados con el servicio a través de Resend: mensajes de cuenta y bienvenida, respuestas a tus mensajes de contacto o comentarios y, salvo que canceles esa opción, correos ocasionales de reenganche; los recibos de pago los envía Polar, nuestro procesador de pagos`,
          `medir y mejorar LexiClash mediante analítica, solo si has aceptado las cookies de analítica`,
          `detectar y corregir errores automáticamente mediante informes de fallos/errores`,
          `mostrar publicidad fuera de las páginas de aula y educación, solo si has aceptado las cookies de publicidad (o, en apps nativas, de forma acorde con las políticas de anuncios de las tiendas de aplicaciones)`,
          `mantener el juego limpio y hacer cumplir nuestras Condiciones de Servicio`,
        ],
      },
      {
        title: '3. Servicios de terceros',
        content: `Dependemos de los siguientes proveedores para operar LexiClash. Cada uno recibe solo los datos que necesita para cumplir su función:`,
        items: [
          `Supabase — autenticación, base de datos y almacenamiento de archivos`,
          `PostHog — analítica de producto (alojada en la UE), solo con tu consentimiento`,
          `Google Analytics (GA4) — analítica de uso, solo con tu consentimiento`,
          `Sentry — informes automáticos de fallos y errores`,
          `LogRocket — reproducción de sesiones y registros de errores, solo con tu consentimiento`,
          `Google AdMob y Google H5 Games Ads en la versión web — publicidad, solo fuera de las páginas de aula/educación y solo con tu consentimiento`,
          `ayeT-Studios — un muro de ofertas opcional para "ganar monedas" en la versión web; nunca se muestra a una cuenta marcada como perteneciente a un menor`,
          `Resend — el envío de los correos descritos arriba en nuestro nombre`,
          `Polar — procesamiento de pagos y Merchant of Record de las suscripciones Pro`,
          `API de Google Classroom — solo si un docente decide conectarla; consulta "Datos de usuario de Google"`,
          `Google y Discord — inicio de sesión mediante OAuth`,
        ],
      },
      {
        title: '4. Publicidad de terceros',
        content: `LexiClash se financia en parte con publicidad fuera del uso educativo y de aula. Nunca mostramos anuncios en páginas de docentes, alumnos, aulas o educación, ni durante una partida multijugador vinculada a un aula.`,
        subsections: [
          {
            title: 'Cómo funciona la publicidad',
            items: [
              `Usamos Google AdMob en nuestra app móvil nativa, y Google H5 Games Ads (y, en algunas plataformas, los anuncios propios de esa plataforma) en la versión web.`,
              `Los anuncios solo se cargan después de que aceptes la categoría de consentimiento "Publicidad"; esto utiliza las señales de Consent Mode v2 de Google.`,
              `Para cualquier cuenta que no hayamos confirmado como perteneciente a un adulto, los anuncios se sirven en los modos de Google dirigidos a menores y de edad inferior al consentimiento (TFCD/TFUA), que desactivan la personalización y limitan el contenido publicitario a una clasificación general.`,
              `También podemos mostrar un muro de ofertas opcional para "ganar monedas" (ayeT-Studios) en la versión web; nunca se muestra a una cuenta marcada como menor, ni en páginas de aula/educación.`,
              `Nunca vendemos tu información personal a anunciantes.`,
            ],
          },
          {
            title: 'Tus opciones',
            content: `Puedes controlar la publicidad en LexiClash de las siguientes formas:`,
            items: [
              `cambiar tu elección de cookies de publicidad en cualquier momento desde nuestro banner de cookies`,
              `desactivar la publicidad personalizada en la Configuración de anuncios de Google (adssettings.google.com)`,
              `revisar las prácticas de privacidad publicitaria de Google en policies.google.com/technologies/ads`,
              `desactivar las cookies publicitarias de otros proveedores participantes en aboutads.info`,
              `gestionar o eliminar cookies desde la configuración de tu navegador; desactivar las cookies esenciales puede impedir que el sitio funcione correctamente`,
            ],
          },
        ],
      },
      {
        title: '5. Cookies y almacenamiento local',
        content: `Usamos cookies y almacenamiento local en tres categorías, mostradas en nuestro banner de cookies: Esenciales, siempre activas, necesarias para iniciar sesión, la seguridad y recordar preferencias básicas como el tema y el idioma; puede que el sitio no funcione sin ellas. Analítica, usada solo si la aceptas, que activa PostHog, Google Analytics y LogRocket, como se describe arriba. Publicidad, usada solo si la aceptas, que permite a Google mostrar y medir anuncios fuera de las páginas de aula/educación, como se describe arriba. Puedes cambiar tu elección en cualquier momento desde el banner de cookies o la configuración de tu navegador.`,
      },
      {
        title: '6. Datos de usuario de Google',
        content: `Esta sección reúne en un solo lugar todo lo que LexiClash hace con los datos que recibe de las API de Google.`,
        subsections: [
          {
            title: 'Inicio de sesión con Google',
            content: `Cuando inicias sesión en tu propia cuenta de LexiClash con Google, Google comparte con nosotros tu nombre, tu dirección de correo electrónico y tu foto de perfil, para que podamos crear y autenticar tu cuenta, tal y como se describe en "Información que recopilamos" más arriba. No solicitamos ningún acceso a Google Classroom como parte de este inicio de sesión.`,
          },
          {
            title: 'Integración con Google Classroom (opcional, Teacher Pro)',
            content: `Si un docente conecta explícitamente su cuenta de Google para enviar calificaciones a Google Classroom, LexiClash accede únicamente a lo que esa función necesita, y solo mientras el docente la está usando:`,
            items: [
              `Tu lista de cursos de Google Classroom, para que puedas elegir qué clase calificar.`,
              `La lista de alumnos de esa clase: el identificador de usuario de Google Classroom de cada alumno y, para poder emparejarlos con tus alumnos de LexiClash, su dirección de correo escolar.`,
              `La tarea que selecciones o crees, y el estado de entrega de cada alumno para esa tarea.`,
              `Usamos esto únicamente para emparejar a un alumno de LexiClash con su cuenta de Google Classroom por correo electrónico, y para escribir la calificación que decidas enviar (y, si nos lo pides, marcar la tarea como devuelta a ese alumno).`,
              `Los datos de la lista de alumnos (nombres, correos, identificadores de usuario de Google) se mantienen en memoria solo durante la única solicitud que envía las calificaciones; nunca se escriben en nuestra base de datos, no se registran en ningún registro (log) y no se incluyen en nada que se devuelva a tu navegador. En los resultados que ves solo aparecen los nombres de tus propios alumnos de LexiClash.`,
              `Las calificaciones solo pueden escribirse en una tarea de Classroom creada por LexiClash: es una restricción que impone la API de Google, no una elección nuestra.`,
              `Tu token de acceso de Google se almacena únicamente en una cookie cifrada (AES-256-GCM) de tipo httpOnly, vinculada a tu cuenta de LexiClash, y caduca al cabo de aproximadamente una hora. No solicitamos ni almacenamos un token de actualización (refresh token) de Google, por lo que nunca conservamos una credencial de Google de larga duración para tu cuenta.`,
              `Nunca vendemos ni compartimos estos datos, ni los usamos para publicidad ni para entrenar modelos de IA o aprendizaje automático.`,
              `Puedes desconectar LexiClash de tu cuenta de Google en cualquier momento en myaccount.google.com/permissions.`,
            ],
          },
          {
            title: 'Política de Datos de Usuario de los Servicios de API de Google',
            content: `Tal y como exige Google, reproducimos aquí, en su idioma original (inglés), la siguiente declaración: "${GOOGLE_LIMITED_USE_CLAUSE}" Más información: ${GOOGLE_LIMITED_USE_URL}`,
          },
        ],
      },
      {
        title: '7. Aulas, centros educativos y privacidad de menores',
        content: `El producto general de LexiClash, financiado con publicidad, está dirigido a jugadores de 13 años en adelante, en línea con las clasificaciones de edad de nuestras tiendas de aplicaciones. Nuestro producto independiente para aulas/docentes está pensado para que lo usen alumnos de cualquier edad escolar, bajo la supervisión de un docente o centro educativo:`,
        items: [
          `Los alumnos invitados que se unen a un aula con un código no proporcionan nombre, correo ni ningún dato personal: reciben una cuenta anónima, y nunca les mostramos anuncios ni el muro de ofertas.`,
          `Cuando un docente crea un aula e invita a alumnos, el docente (y su centro) es responsable de obtener el consentimiento parental o de tutela que exija la ley para alumnos menores de 13 años, sobre la misma base de "responsable escolar" que usan habitualmente los proveedores de tecnología educativa. LexiClash no verifica por sí misma la edad de cada alumno en ese flujo.`,
          `Para cuentas fuera del flujo de aula que identifiquemos como pertenecientes a un usuario menor de 14 años, mantenemos un registro de consentimiento parental (el correo de un progenitor, el año de nacimiento del menor y el momento en que se otorgó el consentimiento), según exigen el RGPD, la Ley de Protección de la Privacidad de Israel y las directrices del Ministerio de Educación israelí.`,
          `Nunca vendemos la información personal de ningún usuario, incluida la de un menor, a terceros con fines de marketing.`,
          `Un padre, madre o tutor puede escribirnos a lexiclash.game@gmail.com para revisar, corregir o eliminar la información de su hijo o hija.`,
        ],
      },
      {
        title: '8. Conservación de datos',
        content: `Conservamos la información solo mientras sirva al propósito para el que la recopilamos:`,
        items: [
          `Datos de cuenta, perfil y aula: hasta que tú, o el docente del aula, los elimines, o hasta que elimines tu cuenta.`,
          `Estadísticas de partidas y entradas en las clasificaciones: se conservan para preservar la integridad de las clasificaciones, y se eliminan cuando eliminas tu cuenta.`,
          `Estado de sesión/partida en Redis: se elimina automáticamente, normalmente dentro de la hora siguiente a que termine la partida.`,
          `Datos de la lista de alumnos de Google Classroom (nombres, correos, identificadores de usuario): nunca se almacenan; se mantienen en memoria solo durante la única solicitud de sincronización de calificaciones, como se describe en "Datos de usuario de Google".`,
          `Tu token de acceso de Google Classroom: caduca automáticamente al cabo de aproximadamente una hora; nunca almacenamos un token de actualización.`,
          `Datos de analítica y de fallos: se conservan según la política propia de cada proveedor (PostHog, Google Analytics, Sentry, LogRocket).`,
          `Eliminar tu cuenta es inmediato: elimina de forma permanente tu cuenta, tu perfil y tus tokens de notificaciones push, y arrastra la eliminación de las aulas, membresías y registros de progreso vinculados a tu cuenta.`,
        ],
      },
      {
        title: '9. Seguridad de los datos',
        content: `Aplicamos medidas de seguridad conforme a los estándares del sector: todo el tráfico se cifra con HTTPS; la autenticación se realiza mediante los flujos OAuth de Supabase; los registros de tu base de datos se almacenan en la infraestructura cifrada de Supabase; tu token de acceso de Google Classroom se almacena únicamente en una cookie httpOnly cifrada con AES-256-GCM; y el juego multijugador utiliza conexiones WebSocket seguras.`,
      },
      {
        title: '10. Tus derechos',
        content: `Según el lugar donde vivas, puedes tener derecho a:`,
        items: [
          `acceder a los datos personales que tenemos sobre ti, desde tu página de perfil o poniéndote en contacto con nosotros`,
          `corregir o actualizar tu información en cualquier momento`,
          `eliminar tu cuenta y los datos asociados a ella, de forma inmediata, desde la configuración de tu cuenta`,
          `preguntarnos qué datos conservamos y por qué, y oponerte o restringir algunos de sus usos`,
          `recibir una copia de tus datos en un formato portátil, si lo solicitas`,
          `Para ejercer cualquiera de estos derechos, escríbenos a lexiclash.game@gmail.com.`,
        ],
      },
      {
        title: '11. Pagos y suscripciones',
        content: `Cuando compras una suscripción Pro, nuestro procesador de pagos, Polar, gestiona la transacción y actúa como Merchant of Record de LexiClash. Recibimos el plan de tu suscripción, su estado y el período de facturación, pero nunca los datos completos de tu tarjeta: estos los gestionan Polar y sus propios procesadores de pago, que también recaudan y liquidan los impuestos aplicables. En el caso de las cuentas de aula/docente, procesamos los datos de los alumnos que nos proporcionas para prestar el servicio, tal y como se describe en esta política y en nuestras Condiciones de Servicio.`,
      },
      {
        title: '12. Usuarios internacionales',
        content: `Tus datos pueden transferirse y almacenarse en países distintos del tuyo, incluidos países con leyes de protección de datos diferentes a las tuyas. Al usar LexiClash, aceptas dicha transferencia.`,
      },
      {
        title: '13. Cambios en esta política',
        content: `Podemos actualizar esta Política de Privacidad de vez en cuando. Publicaremos cualquier cambio en esta página junto con una nueva fecha de entrada en vigor. Si sigues usando LexiClash después de un cambio, se entiende que aceptas la política actualizada.`,
      },
      {
        title: '14. Ley aplicable',
        content: `Esta Política de Privacidad se rige por las leyes del Estado de Israel. Cualquier controversia se resolverá en los tribunales ubicados en Israel.`,
      },
      {
        title: '15. Contacto',
        content: `¿Tienes preguntas sobre esta política o sobre tus datos? Escríbenos a lexiclash.game@gmail.com y te responderemos.`,
      },
    ],
  },
  ru: {
    title: 'Политика конфиденциальности',
    intro: `Настоящая Политика конфиденциальности объясняет, как LexiClash — сервис, которым управляет Ohad Fisher, индивидуальный предприниматель из Израиля ("мы"), — собирает, использует и защищает вашу личную информацию при использовании нашей многопользовательской словесной игры и платформы для классов на сайте lexiclash.live. Этот документ не является юридической консультацией.`,
    sections: [
      {
        title: '1. Информация, которую мы собираем',
        content: `В зависимости от того, как вы используете LexiClash, мы собираем следующие категории информации:`,
        items: [
          `Данные учётной записи и входа: при входе через Google или Discord мы получаем от этого провайдера ваше имя, адрес электронной почты и фото профиля (о том, что именно передаёт вход через Google, см. раздел «Данные пользователей Google» ниже); обработка выполняется через Supabase Auth.`,
          `Профиль игрока: отображаемое имя, аватар (эмодзи, цвет или загруженное изображение) и игровые настройки.`,
          `Игровые данные: очки, найденные слова, победы, сыгранные партии, время игры, достижения и место в таблицах лидеров.`,
          `Временные данные сессии: текущее состояние комнаты/игры, хранящееся в Redis и удаляемое автоматически, как правило, в течение часа после окончания игры.`,
          `Данные класса, если вы или ваша школа используете наши инструменты для учителей: названия классов, коды присоединения, список учеников в классе, назначенные уроки и данные о прохождении/прогрессе каждого ученика по этим урокам. Ученики-гости, присоединяющиеся по коду класса, не указывают имя или email — им создаётся анонимная учётная запись.`,
          `Необязательные данные синхронизации с Google Classroom — только если учитель подключил её: см. отдельный раздел «Данные пользователей Google» ниже.`,
          `Платёжные данные: при оформлении подписки Pro наш платёжный процессор Polar передаёт нам план подписки, её статус и период оплаты. Мы никогда не получаем и не храним полный номер вашей карты.`,
          `Сообщения, которые вы нам отправляете: если вы используете форму обратной связи или форму отзывов, мы сохраняем сообщение и указанный вами адрес электронной почты, чтобы иметь возможность ответить.`,
          `Технические и аналитические данные — только с вашего согласия: тип устройства/браузера, просмотренные страницы и события внутри приложения, собираемые через PostHog, Google Analytics и LogRocket, как описано в разделах «Сторонние сервисы» и «Файлы cookie и локальное хранилище».`,
          `Отчёты о сбоях и ошибках, автоматически собираемые через Sentry, чтобы помочь нам находить и исправлять ошибки. Такие отчёты включают случайный идентификатор учётной записи и имя пользователя, но никогда — ваш адрес электронной почты.`,
        ],
      },
      {
        title: '2. Как мы используем вашу информацию',
        content: `Мы используем указанную выше информацию, чтобы:`,
        items: [
          `создавать и защищать вашу учётную запись и обеспечивать вход в неё`,
          `обеспечивать работу игры — подбор соперников, начисление очков и таблицы лидеров — и показывать ваш профиль и статистику другим игрокам`,
          `обеспечивать работу функций для классов: позволять учителям создавать классы и уроки, отслеживать прогресс учеников, формировать отчёты и (по желанию) синхронизировать оценки с Google Classroom`,
          `отправлять вам сервисные письма через Resend: письма об учётной записи и приветственные письма, ответы на ваши обращения через форму контактов/отзывов и (если вы не отказались) периодические письма для возврата к игре; платёжные квитанции отправляет Polar, наш платёжный процессор`,
          `измерять и улучшать LexiClash с помощью аналитики — только если вы приняли аналитические файлы cookie`,
          `автоматически находить и исправлять ошибки с помощью отчётов о сбоях/ошибках`,
          `показывать рекламу вне страниц класса и образовательного раздела — только если вы приняли рекламные файлы cookie (а в нативных приложениях — в соответствии с рекламными политиками магазинов приложений)`,
          `поддерживать честность игры и соблюдение наших Условий использования`,
        ],
      },
      {
        title: '3. Сторонние сервисы',
        content: `Для работы LexiClash мы пользуемся услугами следующих поставщиков. Каждый из них получает только те данные, которые нужны ему для выполнения своей роли для нас:`,
        items: [
          `Supabase — аутентификация, база данных и хранение файлов`,
          `PostHog — аналитика продукта (хостинг в ЕС), только с вашего согласия`,
          `Google Analytics (GA4) — аналитика использования, только с вашего согласия`,
          `Sentry — автоматические отчёты о сбоях и ошибках`,
          `LogRocket — запись сессий и журналы ошибок, только с вашего согласия`,
          `Google AdMob и Google H5 Games Ads в веб-версии — реклама, только вне страниц класса/образования и только с вашего согласия`,
          `ayeT-Studios — необязательная витрина предложений «заработай монеты» в веб-версии; никогда не показывается учётной записи, помеченной как детская`,
          `Resend — отправка указанных выше писем от нашего имени`,
          `Polar — обработка платежей и роль Merchant of Record для подписок Pro`,
          `Google Classroom API — только если учитель решит подключить его; см. «Данные пользователей Google»`,
          `Google и Discord — вход через OAuth`,
        ],
      },
      {
        title: '4. Реклама третьих лиц',
        content: `LexiClash частично финансируется за счёт рекламы вне использования в классе и образовательного контекста. Мы никогда не показываем рекламу на страницах учителя, ученика, класса или образовательного раздела, а также во время многопользовательской игры, связанной с классом.`,
        subsections: [
          {
            title: 'Как работает реклама',
            items: [
              `Мы используем Google AdMob в нашем нативном мобильном приложении и Google H5 Games Ads (а на некоторых платформах — собственную рекламу этой платформы) в веб-версии.`,
              `Реклама загружается только после того, как вы примете категорию согласия «Реклама»; для этого используются сигналы Google Consent Mode v2.`,
              `Для любой учётной записи, которую мы не подтвердили как принадлежащую взрослому, реклама показывается в режимах Google для детской аудитории и лиц младше возраста согласия (TFCD/TFUA), что отключает персонализацию рекламы и ограничивает рекламный контент общей возрастной категорией.`,
              `Мы также можем показывать необязательную витрину предложений «заработай монеты» (ayeT-Studios) в веб-версии; она никогда не показывается учётной записи, помеченной как детская, и не показывается на страницах класса/образования.`,
              `Мы никогда не продаём вашу личную информацию рекламодателям.`,
            ],
          },
          {
            title: 'Ваш выбор',
            content: `Вы можете управлять рекламой в LexiClash следующими способами:`,
            items: [
              `в любой момент изменить свой выбор рекламных файлов cookie через баннер cookie`,
              `отказаться от персонализированной рекламы в настройках рекламы Google (adssettings.google.com)`,
              `ознакомиться с политикой конфиденциальности Google в отношении рекламы на policies.google.com/technologies/ads`,
              `отказаться от рекламных файлов cookie других участвующих поставщиков на aboutads.info`,
              `управлять файлами cookie или удалять их в настройках браузера — отключение необходимых файлов cookie может привести к тому, что сайт перестанет корректно работать`,
            ],
          },
        ],
      },
      {
        title: '5. Файлы cookie и локальное хранилище',
        content: `Мы используем файлы cookie и локальное хранилище в трёх категориях, отображаемых в нашем баннере cookie: Необходимые — всегда включены, нужны для входа, безопасности и запоминания базовых настроек, таких как тема и язык; без них сайт может работать некорректно. Аналитические — используются, только если вы их примете; обеспечивают работу PostHog, Google Analytics и LogRocket, как описано выше. Рекламные — используются, только если вы их примете; позволяют Google показывать и измерять рекламу вне страниц класса/образования, как описано выше. Вы можете изменить свой выбор в любое время через баннер cookie или настройки браузера.`,
      },
      {
        title: '6. Данные пользователей Google',
        content: `В этом разделе в одном месте собрано всё, что LexiClash делает с данными, получаемыми от API Google.`,
        subsections: [
          {
            title: 'Вход через Google',
            content: `Когда вы входите в свою учётную запись LexiClash через Google, Google передаёт нам ваше имя, адрес электронной почты и фото профиля, чтобы мы могли создать и аутентифицировать вашу учётную запись, как описано в разделе «Информация, которую мы собираем» выше. Мы не запрашиваем доступ к Google Classroom в рамках этого входа.`,
          },
          {
            title: 'Интеграция с Google Classroom (по желанию, Teacher Pro)',
            content: `Если учитель явно подключает свою учётную запись Google для отправки оценок в Google Classroom, LexiClash получает доступ только к тому, что необходимо для этой функции, и только пока учитель ею пользуется:`,
            items: [
              `Список ваших курсов в Google Classroom — чтобы вы могли выбрать, какому классу выставлять оценки.`,
              `Список учеников этого класса — идентификатор пользователя Google Classroom каждого ученика и, чтобы мы могли сопоставить их с вашими учениками в LexiClash, их школьный адрес электронной почты.`,
              `Выбранное или созданное вами задание и статус его выполнения каждым учеником.`,
              `Мы используем это только для того, чтобы сопоставить ученика LexiClash с его учётной записью Google Classroom по email и записать оценку, которую вы решили отправить (а по вашему запросу — отметить задание как возвращённое этому ученику).`,
              `Данные списка учеников (имена, email-адреса, идентификаторы пользователей Google) хранятся в памяти только в течение единственного запроса, отправляющего оценки, — они никогда не записываются в нашу базу данных, не логируются и не включаются в то, что возвращается в ваш браузер. В результатах, которые вы видите, отображаются только имена ваших собственных учеников LexiClash.`,
              `Оценки можно записывать только в задание Classroom, созданное самим LexiClash, — это ограничение накладывает API Google, а не наш выбор.`,
              `Ваш токен доступа Google хранится только в зашифрованном (AES-256-GCM) httpOnly cookie, привязанном к вашей учётной записи LexiClash, и истекает примерно через час. Мы не запрашиваем и не храним refresh-токен Google, поэтому у нас никогда нет долгоживущих учётных данных Google для вашей учётной записи.`,
              `Мы никогда не продаём и не передаём эти данные и никогда не используем их для рекламы или обучения моделей ИИ/машинного обучения.`,
              `Вы можете в любой момент отключить LexiClash от своей учётной записи Google на странице myaccount.google.com/permissions.`,
            ],
          },
          {
            title: 'Политика использования данных пользователей API-сервисов Google',
            content: `В соответствии с требованиями Google мы приводим здесь следующее заявление в оригинале на английском языке: «${GOOGLE_LIMITED_USE_CLAUSE}» Подробнее: ${GOOGLE_LIMITED_USE_URL}`,
          },
        ],
      },
      {
        title: '7. Классы, школы и конфиденциальность детей',
        content: `Основной, поддерживаемый рекламой продукт LexiClash предназначен для игроков от 13 лет и старше, в соответствии с возрастными рейтингами в наших магазинах приложений. Наш отдельный продукт для классов/учителей предназначен для использования учениками любого школьного возраста под наблюдением учителя или школы:`,
        items: [
          `Ученики-гости, присоединяющиеся к классу по коду, не предоставляют имя, email или какую-либо личную информацию — им создаётся анонимная учётная запись, и мы никогда не показываем им рекламу или витрину предложений.`,
          `Когда учитель создаёт класс и приглашает учеников, ответственность за получение согласия родителей или опекунов, требуемого законом для учеников младше 13 лет, лежит на учителе (и его школе) — это то же основание «уполномоченного школой лица», которое обычно используют поставщики образовательных технологий. LexiClash самостоятельно не проверяет возраст каждого ученика в этом процессе.`,
          `Для учётных записей вне процесса присоединения к классу, которые мы определяем как принадлежащие пользователю младше 14 лет, мы храним запись о согласии родителей (email родителя, год рождения ребёнка и время получения согласия) в соответствии с требованиями GDPR, израильского Закона о защите частной жизни и рекомендациями Министерства образования Израиля.`,
          `Мы никогда не продаём личную информацию какого-либо пользователя, включая ребёнка, третьим лицам в маркетинговых целях.`,
          `Родитель или опекун может связаться с нами по адресу lexiclash.game@gmail.com, чтобы просмотреть, исправить или удалить информацию о своём ребёнке.`,
        ],
      },
      {
        title: '8. Хранение данных',
        content: `Мы храним информацию только до тех пор, пока она служит цели, для которой была собрана:`,
        items: [
          `Данные учётной записи, профиля и класса — до тех пор, пока вы или учитель класса их не удалите, либо пока вы не удалите свою учётную запись.`,
          `Игровая статистика и записи в таблицах лидеров — сохраняются для поддержания целостности таблиц лидеров и удаляются при удалении вашей учётной записи.`,
          `Состояние сессии/игры в Redis — удаляется автоматически, как правило, в течение часа после окончания игры.`,
          `Данные списка учеников из Google Classroom (имена, email-адреса, идентификаторы пользователей) — никогда не сохраняются; хранятся в памяти только в течение единственного запроса синхронизации оценок, как описано в разделе «Данные пользователей Google».`,
          `Ваш токен доступа Google Classroom — автоматически истекает примерно через час; мы никогда не храним refresh-токен.`,
          `Аналитические данные и данные о сбоях — хранятся в соответствии с собственной политикой каждого поставщика (PostHog, Google Analytics, Sentry, LogRocket).`,
          `Удаление вашей учётной записи происходит немедленно: оно безвозвратно удаляет вашу учётную запись, профиль и токены push-уведомлений, а также приводит к удалению классов, участия в них и записей о прогрессе, связанных с вашей учётной записью.`,
        ],
      },
      {
        title: '9. Безопасность данных',
        content: `Мы применяем меры защиты, соответствующие отраслевым стандартам: весь трафик шифруется по HTTPS; аутентификация выполняется через OAuth-процессы Supabase; записи вашей базы данных хранятся в зашифрованной инфраструктуре Supabase; ваш токен доступа Google Classroom хранится только в зашифрованном (AES-256-GCM) httpOnly cookie; а многопользовательская игра использует защищённые WebSocket-соединения.`,
      },
      {
        title: '10. Ваши права',
        content: `В зависимости от места вашего проживания вы можете иметь право:`,
        items: [
          `получить доступ к своим персональным данным, которые мы храним, через страницу профиля или обратившись к нам`,
          `исправлять или обновлять свою информацию в любое время`,
          `немедленно удалить свою учётную запись и связанные с ней данные через настройки учётной записи`,
          `спросить нас, какие данные мы храним и почему, а также возразить против некоторых видов их использования или ограничить их`,
          `по запросу получить копию своих данных в переносимом формате`,
          `Чтобы воспользоваться любым из этих прав, напишите нам на lexiclash.game@gmail.com.`,
        ],
      },
      {
        title: '11. Платежи и подписки',
        content: `При оформлении подписки Pro наш платёжный процессор Polar обрабатывает транзакцию и выступает в роли Merchant of Record для LexiClash. Мы получаем план вашей подписки, её статус и период оплаты, но никогда — полные данные вашей карты: они обрабатываются Polar и её собственными платёжными процессорами, которые также собирают и уплачивают применимые налоги. Для учётных записей класса/учителя мы обрабатываем предоставленные вами данные учеников для оказания услуги, как описано в этой политике и наших Условиях использования.`,
      },
      {
        title: '12. Международные пользователи',
        content: `Ваши данные могут передаваться и храниться в странах, отличных от страны вашего проживания, в том числе в странах с иными законами о защите данных. Используя LexiClash, вы соглашаетесь на такую передачу.`,
      },
      {
        title: '13. Изменения в этой политике',
        content: `Мы можем время от времени обновлять настоящую Политику конфиденциальности. Любые изменения будут опубликованы на этой странице с новой датой вступления в силу. Продолжение использования LexiClash после внесения изменений означает, что вы принимаете обновлённую политику.`,
      },
      {
        title: '14. Применимое право',
        content: `Настоящая Политика конфиденциальности регулируется законодательством Государства Израиль. Любые споры подлежат разрешению в судах, расположенных в Израиле.`,
      },
      {
        title: '15. Свяжитесь с нами',
        content: `Есть вопросы об этой политике или о ваших данных? Напишите нам на lexiclash.game@gmail.com, и мы вам ответим.`,
      },
    ],
  },
};
