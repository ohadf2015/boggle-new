import { LandingButton, LandingHero, Mark, StatStrip } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { STATS, ES_DICT_FLOOR } from '../data';

export function HeroAnimated({ locale }: { locale: string }) {
  return (
    <div className="flex flex-col gap-8">
      <LandingHero
        eyebrow="Gratis · Sin registrarse · Sin descarga"
        title={
          <>
            Como el <Mark tone="pink">Scrabble en español</Mark>, pero online, gratis y sin registro
          </>
        }
        lead={
          <>
            <strong className="font-bold text-neo-white">¿Buscas scrabble en español online, gratis y sin registrarte?</strong> LexiClash es un juego de palabras propio con la misma gracia: pulsas Crear sala, mandas el enlace y todos buscan palabras en el mismo tablero a la vez. Sin email, sin cuenta y sin app, con más de {ES_DICT_FLOOR} palabras en español, multijugador en tiempo real.
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
        art={LANDING_ART.friends('Dos mascotas de LexiClash jugando a un juego de palabras tipo Scrabble en español, online y multijugador')}
        artTone="purple"
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
