import { LandingButton, LandingHero, Mark, StatStrip } from '@/components/landing/kit';
import { STATS, ES_DICT_FLOOR } from '../data';

export function HeroAnimated({ locale }: { locale: string }) {
  return (
    <div className="flex flex-col gap-8">
      <LandingHero
        eyebrow="Gratis · Sin registrarse · Sin descarga"
        title={
          <>
            Juega gratis <Mark tone="pink">Scrabble español</Mark> sin registrarse
          </>
        }
        lead={
          <>
            <strong className="font-bold text-neo-white">Scrabble español online gratis sin registrarse</strong>: pulsa Crear sala y juegas en el navegador. Sin email, sin cuenta, sin app. Más de {ES_DICT_FLOOR} palabras, multijugador en tiempo real.
          </>
        }
        actions={
          <>
            <LandingButton href={`/${locale}/multiplayer`}>Jugar ahora</LandingButton>
            <LandingButton href={`/${locale}/quick-play`} variant="secondary">
              Probar solo
            </LandingButton>
          </>
        }
        art={{
          src: '/es-mp-hero-mascots.webp',
          alt: 'Dos mascotas de LexiClash en scrabble online español multijugador',
          width: 760,
          height: 760,
        }}
        artTone="pink"
      >
        <p className="text-sm font-bold text-neo-lime">
          Sin registrarte. Sin email. La sala se abre en el navegador.{' '}
          <span className="text-neo-white/70">Tú vs amigos</span>
        </p>
      </LandingHero>
      <StatStrip items={STATS.map((s) => ({ value: s.num, label: s.label }))} />
    </div>
  );
}
