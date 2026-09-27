import { redirect } from 'next/navigation';

// Pattern Switcher was retired in Brain Drills v2 (19 lifetime runs, almost
// no return plays). Old links land on the hub instead of a 404.
export default async function PatternSwitcherPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/brain`);
}
