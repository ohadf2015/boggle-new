import { Section, TileGrid } from '@/components/landing/kit';
import { MODES } from '../data';

export function ModesShowcase() {
  return (
    <Section
      title="Modos para Jugar Scrabble Online Gratis"
      intro="Salta entre modos con un clic. Cada uno cambia el ritmo, la rejilla y la forma de ganar."
    >
      <TileGrid items={MODES.map((m) => ({ title: m.name, body: m.desc }))} />
    </Section>
  );
}
