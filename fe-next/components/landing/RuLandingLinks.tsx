import { LinkPills, Section } from '@/components/landing/kit';

// Internal cross-links between the Russian keyword landing pages. Russian-only pages, so always rendered under /ru.
export const RU_LANDINGS: { slug: string; label: string }[] = [
  { slug: 'igry-v-slova-onlayn', label: 'Игры в слова онлайн' },
  { slug: 'igra-v-assotsiatsii-onlayn', label: 'Игра в ассоциации онлайн' },
  { slug: 'filvordy-onlayn', label: 'Филворды онлайн' },
  { slug: 'slovo-dnya', label: 'Слово дня' },
  { slug: 'balda-onlayn', label: 'Балда онлайн' },
  { slug: 'erudit-onlayn', label: 'Эрудит онлайн' },
  { slug: 'sostav-slova-iz-bukv', label: 'Составь слова из букв' },
];

export function RuLandingLinks({ locale, current, className = 'mb-12' }: { locale: string; current: string; className?: string }) {
  const others = RU_LANDINGS.filter((l) => l.slug !== current);
  return (
    <Section title="Другие игры в слова" className={className}>
      <LinkPills items={others.map((l) => ({ href: `/${locale}/${l.slug}`, label: l.label }))} />
    </Section>
  );
}
