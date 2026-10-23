'use client';

import Link from 'next/link';

/** Exact-query anchor for GR #3729. One link, no banner box. */
export const SIN_DESCARGAR_QUERY = 'apalabrados online gratis sin descargar';
export const SIN_DESCARGAR_HREF = '/es/juego-de-palabras-multijugador';

export function ApalabradosSinDescargarLink({ className }: { className?: string }) {
  return (
    <p className={className ?? 'my-6 font-neo-body text-sm leading-relaxed text-neo-white'}>
      <Link
        href={SIN_DESCARGAR_HREF}
        className="font-bold text-neo-cyan underline decoration-2 underline-offset-4"
      >
        {SIN_DESCARGAR_QUERY}
      </Link>
    </p>
  );
}
