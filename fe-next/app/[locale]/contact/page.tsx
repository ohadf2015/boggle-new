import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import ContactPageClient from './PageClient';

export const revalidate = 86400;
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'contact', path: '/contact', locale });
}

const contactSeoContent: Record<string, {
  title: string;
  description: string;
  features: string[];
  faq: { question: string; answer: string }[];
}> = {
  en: {
    title: 'Contact LexiClash — Support, Feedback & Partnership',
    description:
      'Reach the LexiClash team for support, feedback, bug reports, partnership inquiries, press requests, or general questions. LexiClash is built and maintained by a small independent studio, which means every message reaches a real person on the team — not a queue of outsourced agents reading from a script. We read every email, prioritize bug reports affecting active gameplay, and respond personally to feature suggestions that match our roadmap. Whether you found a dictionary edge case, want to translate LexiClash into a new language, run a school program looking for vocabulary tools, or you just hit something weird and want to flag it — we want to hear from you.',
    features: [
      'Direct line to the development team — no outsourced support agents, no canned replies',
      'Bug reports get priority routing — include device, browser, and reproduction steps for fastest fix',
      'Feature suggestions reviewed weekly — popular requests make it onto the public roadmap',
      'Partnership inquiries welcome — game portals, education platforms, language-learning apps, content creators',
      'Press and media contact for interviews, reviews, screenshots, and brand assets',
      'School and classroom inquiries — we offer free educator accounts and bulk word-list customization',
      'Available in English, Hebrew, Swedish, Japanese, and Spanish — write in any language we support',
      'Privacy and data deletion requests handled within 30 days per GDPR and CCPA requirements',
    ],
    faq: [
      {
        question: 'How long does it take to get a response from LexiClash support?',
        answer:
          'We aim to respond to every message within 48 hours during weekdays. Bug reports affecting active gameplay get priority routing and usually receive a response within 12 hours. Complex partnership or technical questions may take 3-5 business days while we coordinate internally. If you have not heard back after 5 business days, the message likely got caught in our spam filter — please resend with a different subject line.',
      },
      {
        question: 'Can I suggest new features or game modes?',
        answer:
          'Absolutely — player suggestions drive a large portion of the LexiClash roadmap. The Adventure, Blast, and Word Hunt modes all started as player requests. Use the contact form to describe the feature, why you want it, and what existing game (if any) does it well. We review every suggestion in our weekly planning meeting and respond personally to ones we are considering.',
      },
      {
        question: 'I found a bug — what is the fastest way to get it fixed?',
        answer:
          'Email us with: (1) what you were doing when it happened, (2) what device, browser, and operating system you are on, (3) any error message or screenshot, and (4) whether you can reproduce it consistently. Bug reports with reproduction steps usually ship a fix within one release cycle (3-7 days). Critical gameplay bugs are patched within hours.',
      },
      {
        question: 'Do you accept translation contributions or community localizations?',
        answer:
          'Yes — LexiClash currently supports English, Hebrew, Swedish, Japanese, and Spanish, all maintained in collaboration with native speakers. If you are fluent in a language not yet supported and want to help bring LexiClash to your community, email us with your background and the language you want to add. We share the translation files, review a sample, and credit contributors in the About page.',
      },
      {
        question: 'Can teachers, schools, or libraries use LexiClash for classroom programs?',
        answer:
          'Yes. LexiClash is used in classrooms for vocabulary expansion, ESL practice, and friendly competitive learning. We offer free educator accounts with custom word lists, no ads, and a quiet leaderboard for student groups. Contact us with your school or program name and we will set you up — there is no paid tier required.',
      },
      {
        question: 'How do I delete my LexiClash account and all associated data?',
        answer:
          'You can delete your account directly from the Account Settings page (Settings → Account → Delete Account). All personal data is erased within 30 days as required by GDPR and CCPA. If you cannot access the in-app option for any reason, email us at lexiclash.game@gmail.com from the email tied to the account and we will process the deletion manually.',
      },
      {
        question: 'Is there a Discord, subreddit, or community forum for LexiClash?',
        answer:
          'We have an active Discord community where players share strategy, request features, report bugs, and run informal tournaments. Join via the link in the footer. For longer-form discussion, the r/LexiClash subreddit is a slower but more searchable place to find past threads and answers.',
      },
    ],
  },
  he: {
    title: 'צור קשר עם LexiClash',
    description: 'פנו לצוות LexiClash עם משוב, דיווחי באגים, שאלות או בקשות שיתוף פעולה.',
    features: ['שלחו משוב על מצבי משחק ותכונות', 'דווחו על באגים או בעיות טכניות', 'פניות שיתוף פעולה מוזמנות'],
    faq: [{ question: 'כמה זמן לוקח לקבל תשובה?', answer: 'אנחנו שואפים להשיב תוך 48 שעות. דיווחי באגים ובעיות דחופות מקבלים עדיפות.' }],
  },
  sv: {
    title: 'Kontakta LexiClash — Hör av Dig',
    description: 'Kontakta LexiClash-teamet med feedback, buggrapporter eller frågor.',
    features: ['Skicka feedback om spellägen och funktioner', 'Rapportera buggar', 'Samarbetsförfrågningar välkomnas'],
    faq: [{ question: 'Hur lång tid tar det att få svar?', answer: 'Vi siktar på att svara inom 48 timmar. Buggrapporter prioriteras.' }],
  },
  ja: {
    title: 'LexiClashに連絡 — お問い合わせ',
    description: 'フィードバック、バグ報告、パートナーシップのお問い合わせなど、LexiClashチームにご連絡ください。',
    features: ['ゲームモードや機能についてのフィードバック送信', 'バグや技術的問題の報告', 'パートナーシップのお問い合わせ歓迎'],
    faq: [{ question: '返信にどのくらいかかりますか？', answer: '48時間以内の返信を目指しています。バグ報告と緊急の問題は優先されます。' }],
  },
  es: {
    title: 'Contacta LexiClash — Ponte en Contacto',
    description: 'Contacta al equipo de LexiClash para comentarios, reportes de errores, consultas de asociación o preguntas.',
    features: ['Envía comentarios sobre modos de juego y características', 'Reporta errores o problemas técnicos', 'Consultas de asociación bienvenidas'],
    faq: [
      { question: '¿Cuánto tarda la respuesta?', answer: 'Intentamos responder en 48 horas. Los reportes de errores y problemas urgentes tienen prioridad.' },
      { question: '¿Puedo sugerir nuevas funciones?', answer: 'Por supuesto — nos encanta escuchar ideas de los jugadores. Usa el formulario de contacto para describir tu sugerencia.' },
    ],
  },
};

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = contactSeoContent[locale] ?? contactSeoContent.en;
  return (
    <>
      <ContactPageClient />
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
      />
    </>
  );
}
