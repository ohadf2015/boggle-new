import Link from 'next/link';

/** Exact-query anchor for GR #12022. The link text is the query, nothing else. */
export const DESCARGAR_SCRABBLE_PC_QUERY = 'descargar scrabble en español gratis para pc';
export const DESCARGAR_SCRABBLE_PC_HREF = '/es/juego-de-palabras-multijugador';

export function DescargarScrabblePcLink({
  lead,
  className,
}: {
  lead?: string;
  className?: string;
}) {
  return (
    <p className={className ?? 'my-6 font-neo-body text-sm leading-relaxed text-neo-white'}>
      {lead ? <span>{lead} </span> : null}
      <Link
        href={DESCARGAR_SCRABBLE_PC_HREF}
        className="font-bold text-neo-cyan underline decoration-2 underline-offset-4"
      >
        {DESCARGAR_SCRABBLE_PC_QUERY}
      </Link>
    </p>
  );
}
