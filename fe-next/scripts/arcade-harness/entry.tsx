import { createRoot } from 'react-dom/client';
import ArcadeHub from '@/components/holidays/arcade/ArcadeHub';

const lang = new URLSearchParams(location.search).get('lang') ?? 'en';
document.documentElement.lang = lang;
document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';

createRoot(document.getElementById('root')!).render(
  <main className="flex min-h-dvh flex-col bg-neo-navy">
    <ArcadeHub />
  </main>,
);
