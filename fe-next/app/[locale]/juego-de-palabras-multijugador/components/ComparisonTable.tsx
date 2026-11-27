import { Check, X } from 'lucide-react';
import { CompareTable, Section } from '@/components/landing/kit';
import { COMPARISON, type CompareCell } from '../data';

const MARK = 'inline-grid h-7 w-7 place-items-center rounded-md border-2 border-neo-black';

function Cell({ value }: { value: CompareCell }) {
  if (value === true) {
    return (
      <span aria-label="Sí" className={`${MARK} bg-neo-lime`}>
        <Check className="h-4 w-4" strokeWidth={3.5} aria-hidden />
        <span className="sr-only">Sí</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span aria-label="No" className={`${MARK} bg-neo-white`}>
        <X className="h-4 w-4" strokeWidth={3.5} aria-hidden />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return <>{value}</>;
}

export function ComparisonTable() {
  return (
    <Section
      title="LexiClash vs Scrabble vs Apalabrados"
      intro="Por qué LexiClash es la alternativa a Scrabble online en español más completa de 2026."
    >
      <CompareTable
        columns={[<span key="c" className="sr-only">Característica</span>, ...COMPARISON.columns]}
        rows={COMPARISON.rows.map((row) => [row.label, ...row.cells.map((c, i) => <Cell key={i} value={c} />)])}
        captionHidden
        caption="Comparación de LexiClash con Scrabble y Apalabrados online: precio, registro, multijugador en tiempo real, modos de juego y anuncios."
      />
    </Section>
  );
}
