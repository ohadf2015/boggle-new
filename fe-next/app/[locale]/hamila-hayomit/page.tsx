import type { Metadata } from 'next';
import Link from 'next/link';
import { BASE_URL, CANONICAL, DAILY_URL, dailyWordHeFaqs, buildHamilaHayomitJsonLd } from './seo';
import { CtaBand, FaqList, LandingButton, LandingHero, LandingPage, Prose, Section, Steps, TileGrid } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';


interface PageProps {
  params: Promise<{ locale: string }>;
}


const features = [
  { icon: '🗓️', title: 'מילה יומית חדשה כל בוקר', text: 'לוח חדש בכל יום בחצות. כולם בעולם מפצחים את אותה מילת היום.' },
  { icon: '🌍', title: 'אותו לוח לכל העולם', text: 'תחרות הוגנת — אין יתרון לאף אחד. רק אתם והמילה.' },
  { icon: '🎯', title: 'ציד מילים וגלגל מילים', text: 'שתי גרסאות יומיות שונות, חוויה אחרת בכל פעם.' },
  { icon: '📲', title: 'שתפו את התוצאה', text: 'שולחים לחברים את הניקוד ומספר הניסיונות, בלי ספוילרים.' },
  { icon: '🔥', title: 'רצף יומי', text: 'חזרו כל יום ובנו רצף — תגמולים על עקביות.' },
  { icon: '🏆', title: 'טבלת מובילים גלובלית', text: 'התחרו מול שחקנים מכל העולם, מתאפסת כל יום.' },
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isHe = locale === 'he';

  // Definition/guide intent — deliberately NOT a second "play here" title, so this
  // page does not cannibalize /he/daily (the play-intent doorway) on the SERP.
  const title = 'מה זה "המילה היומית"? מדריך + פאזל מילת היום החינמי | LexiClash';
  const description = 'מה זה "המילה היומית"? כל מה שצריך לדעת על מילת היום — פאזל המילים היומי החינמי של LexiClash: אותו לוח לכל העולם, ציד מילים וגלגל מילים, שיתוף תוצאות וטבלת מובילים. הסבר מלא + משחק, ללא הרשמה.';

  return {
    title,
    description,
    keywords: 'המילה היומית, מילת היום, אתגר יומי, פאזל מילים יומי, משחק מילים יומי, ציד מילים, גלגל מילים, וורדל בעברית, משחק מילים חינם',
    openGraph: {
      title: 'המילה היומית — מה זה ואיך משחקים את מילת היום',
      description: 'המדריך המלא ל"המילה היומית" של LexiClash + הפאזל היומי החינמי. אותו לוח לכל העולם, ציד מילים וגלגל מילים.',
      locale: 'he_IL',
      type: 'website',
      url: CANONICAL,
      images: [{ url: `${BASE_URL}/og-image-he.webp?v=2`, width: 1200, height: 630, alt: 'המילה היומית — LexiClash' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'המילה היומית — פאזל המילים של היום | LexiClash',
      description,
      images: [`${BASE_URL}/og-image-he.webp?v=2`],
    },
    alternates: {
      // Self-referencing Hebrew cluster — the page is Hebrew-only by intent.
      canonical: CANONICAL,
      languages: {
        'x-default': DAILY_URL,
        he: CANONICAL,
        'he-IL': CANONICAL,
      },
    },
    // Locale-gate: only the Hebrew variant is indexable; others consolidate via canonical.
    robots: { index: isHe, follow: true },
  };
}


export default async function HamilaHayomitPage({ params }: PageProps) {
  await params;
  // JSON-LD is hardcoded + angle-bracket-free, so React <script> text children
  // emit valid JSON without escaping — no dangerouslySetInnerHTML needed.
  const jsonLd = JSON.stringify(buildHamilaHayomitJsonLd());

  return (
    <div dir="rtl">
      <LandingPage locale="he" play={{ href: '/he/daily', label: 'שחקו עכשיו ▶' }}>
        <script type="application/ld+json">{jsonLd}</script>

        <LandingHero
          title="המילה היומית — מה זה, ואיך משחקים את מילת היום"
          lead={
            <>
              מחפשים את <strong>המילה היומית</strong>? ב-LexiClash מחכה לכם <strong>מילת היום</strong> בפאזל חדש מדי בוקר.
            </>
          }
          actions={
            <>
              <LandingButton href="/he/daily">שחקו את המילה היומית עכשיו ▶</LandingButton>
              <LandingButton href="/he/daily/word-wheel" variant="secondary">
                גלגל המילים היומי
              </LandingButton>
            </>
          }
          art={LANDING_ART.wheel('קמע של LexiClash מסובב גלגל אותיות')}
          artTone="lime"
          more={
            <p>
              כל שחקן בעולם מקבל בדיוק את אותו הלוח — מפצחים, שומרים על הרצף ומשתפים את התוצאה. ללא הרשמה, ללא הורדה,
              חינם לגמרי.
            </p>
          }
        />

        <Section title='מה זה "המילה היומית"?'>
          <Prose paper>
            <p>
              <strong>המילה היומית</strong> היא פאזל מילים יומי שבו כל השחקנים מקבלים את אותו אתגר בדיוק. ב-LexiClash היא
              מגיעה בשתי גרסאות: <strong>ציד המילים</strong> — שילוב של וורדל ובוגל שבו מאתרים מילה נסתרת ב-10 ניסיונות,
              ו<strong>גלגל המילים</strong> — שבו מרכיבים כמה שיותר מילים מאותיות סביב אות מרכזית. כל בוקר בחצות מתחיל
              אתגר חדש וטבלת מובילים נקייה.
            </p>
          </Prose>
        </Section>

        <Section title="למה לשחק את המילה היומית של LexiClash?">
          <TileGrid items={features.map((f) => ({ title: f.title, body: f.text }))} />
        </Section>

        <Section title="איך משחקים — צעד אחר צעד">
          <Steps
            items={[
              {
                title: (
                  <>
                    נכנסים ל<Link href="/he/daily" className="underline decoration-neo-pink decoration-2">עמוד האתגר היומי</Link>.
                  </>
                ),
              },
              { title: 'בוחרים בין ציד המילים לגלגל המילים.' },
              { title: 'מפצחים את מילת היום במספר הניסיונות המותר.' },
              { title: 'שולחים לחברים את התוצאה, מאתגרים אותם לנסות בעצמם ובונים רצף יומי.' },
            ]}
          />
        </Section>

        <Section title="שאלות נפוצות על המילה היומית">
          <FaqList items={dailyWordHeFaqs} />
        </Section>

        <CtaBand
          tone="cyan"
          title="מוכנים לפצח את מילת היום?"
          body="המילה היומית מחכה. הצטרפו לשחקנים מכל העולם, התחילו רצף ותראו עד לאן תגיעו בטבלת המובילים."
          actions={<LandingButton href="/he/daily">שחקו עכשיו ▶</LandingButton>}
          art={LANDING_ART.trophy('')}
        />
      </LandingPage>
    </div>
  );
}
