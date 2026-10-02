'use client';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { TEACHER_GAME_MODES, type ModeAccent } from '@/lib/education/gameModes';

const ACCENT_BG: Record<ModeAccent, string> = {
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  purple: 'bg-neo-purple',
};

const ACCENT_TEXT: Record<ModeAccent, string> = {
  lime: 'text-neo-navy',
  pink: 'text-neo-black',
  cyan: 'text-neo-navy',
  purple: 'text-neo-black',
};

/** The live class modes a teacher picks in the lobby, from the same list the lobby uses. */
export function SixModeTour() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <p className="font-neo-display text-sm font-black uppercase tracking-wider text-neo-pink-light">
        {t('eg2Land.modes.eyebrow')}
      </p>
      <h2 className="mt-2 text-balance font-neo-display text-2xl font-black leading-tight text-neo-white sm:text-3xl">
        {t('eg2Land.modes.title')}
      </h2>
      <p className="mt-2 max-w-[60ch] text-base text-neo-white/75">{t('eg2Land.modes.sub')}</p>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {TEACHER_GAME_MODES.map((mode) => (
          <li
            key={mode.id}
            data-testid="landing-mode-card"
            className="flex flex-col overflow-hidden rounded-neo border-3 border-neo-black bg-neo-cream shadow-hard"
          >
            <div className={`relative flex h-20 items-end justify-center border-b-3 border-neo-black sm:h-28 ${ACCENT_BG[mode.accent]}`}>
              <Image src={mode.poster} alt="" aria-hidden="true" width={112} height={112} className="h-full w-auto object-contain object-bottom" />
              <span className={`absolute end-2 top-2 rounded-neo-pill border-2 border-neo-black bg-neo-cream px-2 py-0.5 font-neo-display text-[11px] font-black ${ACCENT_TEXT.lime}`}>
                {t('eg2Land.modes.minutes', undefined, { minutes: String(mode.minutes) })}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-3 sm:p-4">
              <h3 className="font-neo-display text-base font-black leading-tight text-neo-navy">{t(mode.nameKey)}</h3>
              <p className="mt-1 text-xs leading-snug text-neo-navy/75 sm:text-sm">{t(mode.howKey)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default SixModeTour;
