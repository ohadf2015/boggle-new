import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Prose, Section, Steps, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import {
  BASE_URL,
  CANONICAL,
  META_TITLE,
  META_DESCRIPTION,
  skills,
  dailyPlan,
  ageGroups,
  faqs,
  buildJsonLd,
} from './seo';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const card = 'overflow-hidden rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl';
const inlineLink = 'font-bold underline decoration-neo-pink decoration-2';
const TONES = ['bg-neo-lime', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-yellow'];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: META_TITLE,
    description: META_DESCRIPTION,
    keywords: 'משחקי שפה, אימון קוגניטיבי, משחקי שפה לאימון קוגניטיבי, משחקי מילים לזיכרון, משחקי חשיבה, אימון זיכרון, משחקי מילים למבוגרים, משחקי מילים לגיל השלישי',
    openGraph: {
      title: 'משחקי שפה לאימון קוגניטיבי',
      description: 'איזה משחק מילים מתרגל איזו יכולת, תוכנית של 10 דקות ביום ותשובה כנה על מה המחקר מראה.',
      locale: 'he_IL',
      type: 'article',
      url: CANONICAL,
      images: [{ url: `${BASE_URL}/og-image-he.webp?v=2`, width: 1200, height: 630, alt: 'משחקי שפה לאימון קוגניטיבי — LexiClash' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'משחקי שפה לאימון קוגניטיבי | LexiClash',
      description: META_DESCRIPTION,
      images: [`${BASE_URL}/og-image-he.webp?v=2`],
    },
    alternates: {
      canonical: CANONICAL,
      languages: {
        'x-default': `${BASE_URL}/en/brain-training-word-games`,
        he: `${BASE_URL}/he/mischaqey-safa-imun-kogniti`,
        'he-IL': `${BASE_URL}/he/mischaqey-safa-imun-kogniti`,
      },
    },
    robots: { index: locale === 'he', follow: true },
  };
}

export default async function LanguageGamesCognitivePage({ params }: PageProps) {
  await params;
  const jsonLd = JSON.stringify(buildJsonLd());

  return (
    <div dir="rtl" lang="he">
      <LandingPage locale="he" play={{ href: '/he/brain', label: 'למרכז המוח ▶' }}>
        <script type="application/ld+json">{jsonLd}</script>

        <LandingHero
          title="משחקי שפה לאימון קוגניטיבי"
          lead="משחק מילים טוב מעסיק את הראש: צריך לזכור, להתרכז, לחשוב מהר ולשלוף מילים שלא אומרים כל יום."
          actions={
            <>
              <LandingButton href="/he/brain">התחילו תרגיל של דקה ▶</LandingButton>
              <LandingButton href="/he/multiplayer" variant="secondary">
                שחקו מול חברים
              </LandingButton>
            </>
          }
          art={LANDING_ART.brain('קמע של LexiClash מרים משקולות')}
          artTone="yellow"
          more={
            <p>
              כאן תמצאו איזה סוג משחק מתרגל איזו יכולת, תוכנית של 10 דקות ביום, התאמה לגילים שונים, ותשובה כנה על מה{' '}
              <strong>אימון קוגניטיבי</strong> במשחקים כן ולא עושה.
            </p>
          }
        />

        <Section title="מה זה אימון קוגניטיבי, ולמה דווקא משחקי שפה?">
          <Prose paper>
            <p>
              אימון קוגניטיבי הוא תרגול קבוע של יכולות חשיבה מסוימות דרך משימות קצרות שחוזרים עליהן. ארבע היכולות שמשחקי
              מילים נוגעים בהן הכי ישירות הן <strong>זיכרון עבודה</strong>, <strong>ריכוז</strong>,{' '}
              <strong>מהירות עיבוד</strong> ו<strong>אוצר מילים</strong>.
            </p>
            <p>
              היתרון של משחקי שפה הוא שהחומר כבר מוכר. לא צריך ללמוד כללים של מתמטיקה או לוגיקה, רק לחפש מילים. הטיימר,
              הניקוד ורמת הקושי הופכים את זה לאתגר. התרגילים של LexiClash בנויים בהשראת משימות שחוקרים משתמשים בהן כדי
              לבחון את היכולות האלה, אבל הם משחק ולא כלי קליני.
            </p>
          </Prose>
        </Section>

        <Section title="איזה משחק שפה מתרגל איזו יכולת">
          <div className="grid gap-4 sm:grid-cols-2">
            {skills.map((s, i) => (
              <div key={s.skill} className={card}>
                <span aria-hidden className={`block h-3 border-b-3 border-neo-black ${TONES[i % TONES.length]}`} />
                <div className="flex flex-col gap-1.5 p-5">
                  <h3 className="font-neo-display text-xl font-bold leading-tight">{s.skill}</h3>
                  <p className="text-sm font-bold">{s.game}</p>
                  <p className="text-[15px] leading-relaxed">{s.text}</p>
                  <Link href={s.href} className={`mt-1 self-start ${inlineLink}`}>
                    לתרגיל
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="איך מתחילים לשחק ב-LexiClash">
          <Steps
            items={[
              {
                title: (
                  <>
                    נכנסים ל<Link href="/he/brain" className={inlineLink}>מרכז המוח</Link> ובוחרים תרגיל. אין הרשמה ואין הורדה.
                  </>
                ),
              },
              { title: 'משחקים סיבוב של 60 שניות. הקושי עולה כשמצליחים ויורד כשנתקעים.' },
              {
                title: (
                  <>
                    רוצים לשחק עם אחרים? פותחים חדר ב<Link href="/he/multiplayer" className={inlineLink}>משחק מרובה משתתפים</Link>,
                    שולחים לינק, וכולם משחקים על אותו לוח בזמן אמת.
                  </>
                ),
              },
              { title: 'הלוח בעברית כשהאתר בעברית. כדי לתרגל אנגלית מחליפים שפה בתפריט.' },
            ]}
          />
        </Section>

        <Section title="תוכנית של 10 דקות ביום" intro="קצת כל יום עדיף על הרבה פעם בשבוע. כל שלב קצר, ואפשר לעצור באמצע.">
          <ol className="flex flex-col gap-3">
            {dailyPlan.map((step, i) => (
              <li key={step.minutes} className={`${card} flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:gap-5`}>
                <p className={`shrink-0 self-start rounded-neo border-3 border-neo-black px-3 py-1 font-neo-display text-sm font-bold ${TONES[i % TONES.length]}`}>
                  {step.minutes}
                </p>
                <div>
                  <h3 className="font-neo-display text-lg font-bold">
                    <Link href={step.href} className="underline decoration-neo-pink decoration-2">{step.title}</Link>
                  </h3>
                  <p className="mt-1 text-[15px] leading-relaxed">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="משחקי שפה לפי גיל">
          <TileGrid items={ageGroups.map((g) => ({ title: g.who, body: g.text }))} />
        </Section>

        <Section title="שאלות נפוצות">
          <FaqList items={faqs} />
        </Section>

        <Section title="לקריאה נוספת">
          <LinkPills
            items={[
              { href: '/he/blog/word-games-for-brain-training', label: 'מה המחקר באמת אומר על משחקי מילים ובריאות המוח' },
              { href: '/he/brain-training-word-games', label: '4 תרגילי אימון מוח חינם, 60 שניות כל אחד' },
              { href: '/he/hamila-hayomit', label: 'המילה היומית: מה זה ואיך משחקים' },
            ]}
          />
        </Section>

        <CtaBand
          tone="pink"
          title="דקה אחת, בלי הרשמה"
          body="בחרו תרגיל, שחקו 60 שניות, ותראו איך זה מרגיש."
          actions={<LandingButton href="/he/brain">למרכז המוח ▶</LandingButton>}
          art={LANDING_ART.trophy('')}
        />
      </LandingPage>
    </div>
  );
}
