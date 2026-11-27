import Link from 'next/link';
import { CompareTable, Prose, Section } from '@/components/landing/kit';
import { ES_DICT_FLOOR } from '../data';

/**
 * Competitor headings for "apalabrados online gratis sin descargar", answered
 * without a download how-to. Title and description are frozen.
 */
const QUERY = 'apalabrados online gratis sin descargar';

const MODES: { theirs: string; ours: string }[] = [
  { theirs: 'Clásico / Rápido', ours: 'Sala en tiempo real, 2–50, ronda de 180 s' },
  { theirs: 'Sopa de letras', ours: 'Caza de palabras, en el navegador' },
  { theirs: 'Desafío', ours: 'Desafío diario, el mismo tablero para todos' },
  { theirs: 'Adivina la palabra', ours: 'Rueda de palabras diaria' },
  { theirs: 'Color / Casual', ours: 'No los clonamos. No hay modo de robar fichas.' },
];

const H3 = 'font-neo-display text-xl font-bold';

export function SinDescargarSection({ locale }: { locale: string }) {
  return (
    <Section
      title={QUERY}
      intro={
        <>
          Las páginas que rankean esta búsqueda explican cómo instalar la app. Esta no:{' '}
          <strong className="text-neo-white">{QUERY}</strong> significa abrir el navegador, crear sala y jugar.
          Cero tienda, cero APK, cero cuenta.
        </>
      }
    >
      <div data-seo="sin-descargar" className="grid gap-8 lg:grid-cols-2">
        <div
          role="group"
          aria-label="Apalabrados pide una app. LexiClash se juega en el navegador, sin instalar nada, y publica el suelo del diccionario español."
          className="flex flex-col gap-3"
        >
          <h3 className={H3}>Requisitos: cero descarga</h3>
          <CompareTable
            highlight={2}
            columns={['Antes de la primera palabra', 'Apalabrados (app)', 'LexiClash']}
            rows={[
              ['Instalación', 'Tienda o APK', 'Nada que instalar'],
              ['Cuenta', 'Registro para jugar', 'Sin cuenta'],
              ['Diccionario ES medido', 'No publican el tamaño del Set', `${ES_DICT_FLOOR}+`],
              ['Primera palabra', 'Descargar, instalar, registrarse', 'Crear sala, enlace, deslizar'],
            ]}
            caption={
              <>
                Apalabrados pide una app. LexiClash se juega en el navegador, sin instalar nada, y publica el
                suelo del diccionario español. {ES_DICT_FLOOR}+ es el suelo del Set de validación en español, no
                un recuento de líneas del archivo. Crece cuando entra una palabra aprobada; el suelo no miente al
                día siguiente. Ninguna ficha de la tienda publica esa cifra.
              </>
            }
          />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className={H3}>Modos de Apalabrados, sin instalar la app</h3>
          <CompareTable
            columns={['Su modo', 'Aquí, sin descargar']}
            rows={MODES.map((row) => [row.theirs, row.ours])}
            caption="Qué modo de Apalabrados cubre LexiClash sin descarga."
          />
        </div>
      </div>
      <Prose className="grid max-w-none gap-6 space-y-0 md:grid-cols-2">
        <div className="space-y-2">
          <h3>¿Se puede jugar en el ordenador sin descargar?</h3>
          <p>
            Sí. El mismo enlace abre en el escritorio, en el móvil y en la tablet. No hay versión de PC que
            instalar. Entra a <Link href={`/${locale}/multiplayer`}>la sala multijugador</Link>, pulsa Crear sala y
            pega el enlace. Quien no tenga la app también entra.
          </p>
        </div>
        <div className="space-y-2">
          <h3>Idiomas y puntos, sin la app</h3>
          <p>
            Español es uno de 6 idiomas del navegador (EN, HE, SV, JA, ES, RU). La Ñ se conserva. El valor de
            cada ficha en español está en la tabla de las 100 fichas más abajo — no hace falta la app para
            consultarlo, ni para jugarlo.
          </p>
        </div>
      </Prose>
    </Section>
  );
}
