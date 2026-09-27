import React from 'react';
import type { ConnectionsLandingCopy } from '@/app/[locale]/connections/content';

interface Props {
  copy: ConnectionsLandingCopy['compare'];
}

export default function ConnectionsCompare({ copy }: Props): React.JSX.Element {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="mb-2 font-neo-display text-2xl font-black sm:text-3xl">{copy.heading}</h2>
      <p className="mb-6 text-sm text-neo-gray-200">{copy.sub}</p>

      <div className="overflow-x-auto rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard">
        <table className="w-full min-w-[640px] text-start font-neo-body text-sm">
          <thead>
            <tr className="bg-neo-pink text-neo-white">
              {copy.columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="border-b-2 border-neo-black px-3 py-2 text-start font-neo-display text-xs font-black uppercase tracking-widest sm:text-sm"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {copy.rows.map((row, i) => (
              <tr
                key={row.name}
                className={i === 0 ? 'bg-neo-lime/10 font-bold' : 'odd:bg-neo-navy/40'}
              >
                <th
                  scope="row"
                  className="border-b border-neo-black/40 px-3 py-3 text-start text-neo-white"
                >
                  {row.name}
                </th>
                <td className="border-b border-neo-black/40 px-3 py-3 text-neo-gray-200">{row.doing}</td>
                <td className="border-b border-neo-black/40 px-3 py-3 text-neo-gray-200">{row.length}</td>
                <td className="border-b border-neo-black/40 px-3 py-3 text-neo-gray-200">{row.skill}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
