import Link from 'next/link';

// Internal cross-links between the Russian keyword landing pages. Improves crawl
// discovery + reinforces the ru landing cluster for search. `current` excludes
// the page rendering it. Russian-only pages, so always rendered under /ru.
export const RU_LANDINGS: { slug: string; label: string }[] = [
  { slug: 'igry-v-slova-onlayn', label: 'Игры в слова онлайн' },
  { slug: 'igra-v-assotsiatsii-onlayn', label: 'Игра в ассоциации онлайн' },
  { slug: 'filvordy-onlayn', label: 'Филворды онлайн' },
  { slug: 'slovo-dnya', label: 'Слово дня' },
  { slug: 'balda-onlayn', label: 'Балда онлайн' },
  { slug: 'erudit-onlayn', label: 'Эрудит онлайн' },
  { slug: 'sostav-slova-iz-bukv', label: 'Составь слова из букв' },
];

export function RuLandingLinks({ locale, current }: { locale: string; current: string }) {
  const others = RU_LANDINGS.filter((l) => l.slug !== current);
  return (
    <section className="mb-12">
      <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">Другие игры в слова</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {others.map((l) => (
          <Link
            key={l.slug}
            href={`/${locale}/${l.slug}`}
            className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40"
          >
            <h3 className="font-bold text-neo-cyan">{l.label}</h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
