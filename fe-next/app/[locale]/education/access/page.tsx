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
        <main className="flex h-dvh flex-col overflow-hidden bg-edu-page text-edu-ink">
          {/* Pitch chrome, not the approved card: most loads are the apply funnel. */}
          <div className="h-14 shrink-0 border-b-2 border-edu-line sm:h-16" aria-hidden="true" />
          <section className="mx-auto min-h-0 w-full max-w-md flex-1 overflow-y-auto px-4 py-5 pt-[6svh] sm:py-12 sm:pt-[8svh]">
            <div className="py-3"><div className="mx-auto h-[136px] w-[136px] sm:h-[176px] sm:w-[176px]" /></div>
            <div className="mx-auto mt-4 h-[4.5rem] w-3/4 animate-pulse rounded bg-edu-surface" />
            <div className="mt-5 min-h-[220px] animate-pulse rounded-3xl bg-edu-surface sm:mt-7" />
          </section>
        </main>
      }
    >
      <PageClient />
    </Suspense>
  );
}
