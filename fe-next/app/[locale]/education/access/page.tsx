import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageClient } from './PageClient';

const META: Record<string, { title: string; description: string }> = {
  en: { title: 'Apply for Teacher Access — LexiClash', description: 'Free LexiClash access for teachers. Apply by email and start using classroom word games + brain drills + vocabulary duels.' },
  he: { title: 'בקשת גישה כמורה — LexiClash', description: 'גישה חינמית ל-LexiClash למורים. בקש/י גישה בדוא"ל והתחל/י להשתמש במשחקי כיתה.' },
  sv: { title: 'Ansök om lärarbehörighet — LexiClash', description: 'Gratis LexiClash-åtkomst för lärare. Ansök via e-post och börja använda klassrumsspel.' },
  ja: { title: '教師アクセスを申請 — LexiClash', description: '教師は無料。メールで申請して、教室向けワードゲーム + 脳トレ + 語彙対戦を使えます。' },
  es: { title: 'Solicitar acceso de profesor — LexiClash', description: 'Acceso gratuito a LexiClash para profesores. Solicítalo por correo y empieza a usar juegos de palabras en clase.' },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = META[locale] || META.en;
  // AdSense thin-page sweep (2026-06-17): a form/redeem page carries no content value
  // for the crawl sample. docs/2026-06-17-adsense-thin-page-noindex-spec.md
  return { title: m.title, description: m.description, robots: { index: false, follow: true } };
}

export default function Page() {
  // PageClient reads `?from=` via useSearchParams, which needs a boundary here.
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neo-navy text-neo-white">
          {/* Pitch chrome, not the approved card: most loads are the apply funnel. */}
          <div className="h-14 border-b-2 border-neo-cream sm:h-16" aria-hidden="true" />
          <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
            <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
              <div>
                <div className="h-[3.5rem] w-3/4 animate-pulse rounded bg-neo-navy-light sm:h-[4.5rem]" />
                <div className="mt-4 h-16 max-w-[62ch] animate-pulse rounded bg-neo-navy-light" />
                <div className="mt-6 min-h-[220px] animate-pulse rounded-neo border-neo-thick border-neo-cream/40 bg-neo-navy-light sm:min-h-[260px]" />
              </div>
              <div className="mx-auto w-full max-w-sm lg:max-w-none">
                <div className="aspect-[918/880] w-full animate-pulse rounded-neo-xl border-neo-thick border-neo-cream/40 bg-neo-navy-light" />
              </div>
            </div>
          </section>
        </main>
      }
    >
      <PageClient />
    </Suspense>
  );
}
