import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMPARISON, type CompareCell } from '../data';

function Cell({ value, lead }: { value: CompareCell; lead: boolean }) {
  if (value === true) {
    return (
      <span
        aria-label="Sí"
        className={cn(
          'mx-auto grid h-7 w-7 place-items-center rounded-neo border-2 border-neo-black shadow-hard-sm',
          lead ? 'bg-neo-lime text-neo-navy' : 'bg-neo-lime/70 text-neo-navy',
        )}
      >
        <Check className="h-4 w-4" strokeWidth={3.5} aria-hidden />
      </span>
    );
  }
  if (value === false) {
    return (
      <span
        aria-label="No"
        className="mx-auto grid h-7 w-7 place-items-center rounded-neo border-2 border-neo-black bg-neo-navy text-neo-white shadow-hard-sm"
      >
        <X className="h-4 w-4" strokeWidth={3.5} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'font-neo-body text-xs font-bold sm:text-sm',
        lead ? 'text-neo-pink' : 'text-neo-white',
      )}
    >
      {value}
    </span>
  );
}

export function ComparisonTable() {
  const [lead] = COMPARISON.columns;

  return (
    <section className="mb-14">
      <h2 className="mb-2 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
        {lead} <span className="text-neo-white">vs</span> Scrabble{' '}
        <span className="text-neo-white">vs</span>{' '}
        <span className="text-neo-cyan">Apalabrados</span>
      </h2>
      <p className="mb-6 max-w-xl font-neo-body text-sm text-neo-white sm:text-base">
        Por qué LexiClash es la alternativa a Scrabble online en español más
        completa de 2026.
      </p>

      <div className="overflow-x-auto rounded-neo border-3 border-neo-black shadow-hard-lg">
        <table className="w-full min-w-[34rem] border-collapse bg-neo-navy-light/40 text-left">
          <caption className="sr-only">
            Comparación de LexiClash con Scrabble y Apalabrados online: precio,
            registro, multijugador en tiempo real, modos de juego y anuncios.
          </caption>
          <thead>
            <tr className="border-b-3 border-neo-black">
              <th scope="col" className="p-3 sm:p-4">
                <span className="sr-only">Característica</span>
              </th>
              {COMPARISON.columns.map((col, i) => (
                <th
                  key={col}
                  scope="col"
                  className={cn(
                    'p-3 text-center font-neo-display text-xs font-black uppercase tracking-wide sm:p-4 sm:text-sm',
                    i === 0
                      ? 'bg-neo-pink/15 text-neo-pink'
                      : 'text-neo-white',
                  )}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON.rows.map((row, r) => (
              <tr
                key={row.label}
                className={cn(
                  'border-b-2 border-neo-white/10',
                  r === COMPARISON.rows.length - 1 && 'border-b-0',
                )}
              >
                <th
                  scope="row"
                  className="p-3 font-neo-body text-xs font-bold text-neo-white sm:p-4 sm:text-sm"
                >
                  {row.label}
                </th>
                {row.cells.map((cell, i) => (
                  <td
                    key={`${row.label}-${i}`}
                    className={cn(
                      'p-3 text-center sm:p-4',
                      i === 0 && 'bg-neo-pink/[0.07]',
                    )}
                  >
                    <Cell value={cell} lead={i === 0} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
