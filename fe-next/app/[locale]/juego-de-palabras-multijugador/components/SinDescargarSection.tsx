import Link from 'next/link';
import { ES_DICT_FLOOR } from '../data';

/**
 * Headings the pages above us for "apalabrados online gratis sin descargar"
 * carry that this landing did not (fetched 2026-10-23; Google SERP was 429
 * from this host, so the set is the pages that repeat at the top of the
 * public index for the exact query):
 *   apalabrados.com — Modos de juego, Idiomas y puntos
 *   malavida APK — Requisitos e información adicional
 *   jugandoando — ¿Puedo jugar en mi computadora?
 * Download how-tos (tramitefacil "¿Cómo descargar…?") are answered by the
 * inverse, not copied. Title and meta description stay frozen until 2026-11-19.
 *
 * Unique artifact none of those pages publish: our validation-Set floor
 * next to a 0 MB install. They publish a store listing; we publish the Set.
 */
const QUERY = 'apalabrados online gratis sin descargar';

const MODES: { theirs: string; ours: string }[] = [
  { theirs: 'Clásico / Rápido', ours: 'Sala en tiempo real, 2–50, ronda de 180 s' },
  { theirs: 'Sopa de letras', ours: 'Caza de palabras, en el navegador' },
  { theirs: 'Desafío', ours: 'Desafío diario, el mismo tablero para todos' },
  { theirs: 'Adivina la palabra', ours: 'Rueda de palabras diaria' },
  { theirs: 'Color / Casual', ours: 'No los clonamos. No hay modo de robar fichas.' },
];

export function SinDescargarSection({ locale }: { locale: string }) {
  return (
    <section className="mb-14 max-w-3xl" data-seo="sin-descargar">
      <h2 className="mb-3 font-neo-display text-2xl font-black uppercase leading-tight text-neo-white sm:text-3xl">
        {QUERY}
      </h2>
      <p className="mb-4 font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
        Las páginas que rankean esta búsqueda explican cómo instalar la app.
        Esta no: <strong className="text-neo-cyan">{QUERY}</strong> significa
        abrir el navegador, crear sala y jugar. Cero tienda, cero APK, cero cuenta.
      </p>

      <h3 className="mb-2 font-neo-display text-lg font-black text-neo-lime">
        Requisitos: cero descarga
      </h3>
      <div className="mb-6 overflow-x-auto rounded-neo border-3 border-neo-black shadow-hard-lg">
        <table className="w-full min-w-[28rem] border-collapse bg-neo-navy-light/40 text-left">
          <caption className="sr-only">
            Apalabrados pide una app. LexiClash mide 0 MB y el suelo del diccionario español.
          </caption>
          <thead>
            <tr className="border-b-3 border-neo-black">
              <th scope="col" className="p-3 font-neo-display text-xs font-black uppercase text-neo-white">
                Antes de la primera palabra
              </th>
              <th scope="col" className="p-3 font-neo-display text-xs font-black uppercase text-neo-gray-300">
                Apalabrados (app)
              </th>
              <th scope="col" className="p-3 font-neo-display text-xs font-black uppercase text-neo-lime">
                LexiClash
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b-2 border-neo-white/10">
              <th scope="row" className="p-3 text-sm font-bold text-neo-white">Instalación</th>
              <td className="p-3 text-sm text-neo-gray-200">Tienda o APK</td>
              <td className="p-3 text-sm font-bold text-neo-lime">0 MB</td>
            </tr>
            <tr className="border-b-2 border-neo-white/10">
              <th scope="row" className="p-3 text-sm font-bold text-neo-white">Cuenta</th>
              <td className="p-3 text-sm text-neo-gray-200">Registro para jugar</td>
              <td className="p-3 text-sm text-neo-white">Sin cuenta</td>
            </tr>
            <tr className="border-b-2 border-neo-white/10">
              <th scope="row" className="p-3 text-sm font-bold text-neo-white">Diccionario ES medido</th>
              <td className="p-3 text-sm text-neo-gray-200">No publican el tamaño del Set</td>
              <td className="p-3 text-sm font-bold text-neo-lime">{ES_DICT_FLOOR}+</td>
            </tr>
            <tr>
              <th scope="row" className="p-3 text-sm font-bold text-neo-white">Primera palabra</th>
              <td className="p-3 text-sm text-neo-gray-200">Descargar, instalar, registrarse</td>
              <td className="p-3 text-sm text-neo-white">Crear sala, enlace, deslizar</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mb-6 font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
        {ES_DICT_FLOOR}+ es el suelo del Set de validación en español, no un
        recuento de líneas del archivo. Crece cuando entra una palabra aprobada;
        el suelo no miente al día siguiente. Ninguna ficha de la tienda publica
        esa cifra.
      </p>

      <h3 className="mb-2 font-neo-display text-lg font-black text-neo-cyan">
        Modos de Apalabrados, sin instalar la app
      </h3>
      <div className="mb-6 overflow-x-auto rounded-neo border-3 border-neo-black shadow-hard">
        <table className="w-full min-w-[24rem] border-collapse bg-neo-navy-light/40 text-left">
          <caption className="sr-only">
            Qué modo de Apalabrados cubre LexiClash sin descarga.
          </caption>
          <thead>
            <tr className="border-b-3 border-neo-black">
              <th scope="col" className="p-3 font-neo-display text-xs font-black uppercase text-neo-white">Su modo</th>
              <th scope="col" className="p-3 font-neo-display text-xs font-black uppercase text-neo-cyan">Aquí, sin descargar</th>
            </tr>
          </thead>
          <tbody>
            {MODES.map((row) => (
              <tr key={row.theirs} className="border-b-2 border-neo-white/10">
                <th scope="row" className="p-3 text-sm font-bold text-neo-white">{row.theirs}</th>
                <td className="p-3 text-sm text-neo-white">{row.ours}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mb-2 font-neo-display text-lg font-black text-neo-yellow">
        ¿Se puede jugar en el ordenador sin descargar?
      </h3>
      <p className="mb-4 font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
        Sí. El mismo enlace abre en el escritorio, en el móvil y en la tablet.
        No hay versión de PC que instalar. Entra a{' '}
        <Link href={`/${locale}/multiplayer`} className="text-neo-cyan underline">
          la sala multijugador
        </Link>
        , pulsa Crear sala y pega el enlace. Quien no tenga la app también entra.
      </p>

      <h3 className="mb-2 font-neo-display text-lg font-black text-neo-pink">
        Idiomas y puntos, sin la app
      </h3>
      <p className="font-neo-body text-sm leading-relaxed text-neo-white sm:text-base">
        Español es uno de 6 idiomas del navegador (EN, HE, SV, JA, ES, RU).
        La Ñ se conserva. El valor de cada ficha en español está en la tabla
        de las 100 fichas más abajo — no hace falta la app para consultarlo,
        ni para jugarlo.
      </p>
    </section>
  );
}
