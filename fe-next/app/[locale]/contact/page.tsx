import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import ContactPageClient from './PageClient';

export const dynamic = 'force-dynamic';
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
    title: 'Contact LexiClash — Get in Touch',
    description:
      'Reach the LexiClash team for feedback, bug reports, partnership inquiries, or questions. We read every message and respond as quickly as we can.',
    features: [
      'Submit feedback about game modes, features, or the overall experience',
      'Report bugs or technical issues with detailed descriptions',
      'Partnership and collaboration inquiries welcome',
      'Available in English, Hebrew, Swedish, Japanese, and Spanish',
    ],
    faq: [
      { question: 'How long does it take to get a response?', answer: 'We aim to respond within 48 hours. Bug reports and urgent issues are prioritized.' },
      { question: 'Can I suggest new features?', answer: 'Absolutely — we love hearing player ideas. Use the contact form to describe your feature suggestion and we will review it.' },
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
