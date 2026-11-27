import { CtaBand, LandingButton } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';

export function BottomCTA({ locale }: { locale: string }) {
  return (
    <CtaBand
      tone="pink"
      title="Tus amigos. Tu sala. Tus palabras."
      body={
        <>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide">Sin registro · Sin descargas</span>
          Crea la sala, pega el enlace en WhatsApp y empieza a competir antes de leer esta frase.
        </>
      }
      actions={
        <>
          <LandingButton href={`/${locale}/multiplayer`}>Empezar partida</LandingButton>
          <LandingButton href={`/${locale}/daily`} variant="secondary">
            Desafío diario
          </LandingButton>
        </>
      }
      art={LANDING_ART.trophy('')}
    />
  );
}
