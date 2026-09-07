import * as React from 'react';
import Link from 'next/link';

/**
 * The zero-signup entry point, above the fold.
 *
 * `vocabulary-games-classroom` won its round partly on this: the reader arriving from
 * an informational query is comparing us against pages that ask for nothing, and every
 * other CTA on the education surface routes to `/education/access`, which asks for an
 * account first. R5's critic found the block existed on exactly one page.
 *
 * Pure and self-contained on purpose. The three server pages read a per-locale
 * `content.ts`; the hub is a client component using `t()`. A component that carried its
 * own copy is the only shape that drops into both without a translation round trip.
 *
 * The promise is verified, not assumed: `MultiplayerFlow.tsx` falls back to
 * `getOrCreateStoredUsername()` for the quick-play name and never reads
 * `isAuthenticated`, so a guest is auto-joined with a temporary name and no prompt.
 * Do not add "no email" or "no download" claims here without re-reading that path.
 */

export type NoAccountCopy = { heading: string; body: string; cta: string; note: string };

const COPY: Record<string, NoAccountCopy> = {
  en: {
    heading: 'Start a 2-minute game right now — no account',
    body: 'The button opens a live board in this browser. You get a temporary player name you can change on the way in, and nothing asks for an email or a password.',
    cta: 'Play now — no sign-up',
    note: 'No email · No password · Runs on the school Wi-Fi',
  },
  he: {
    heading: 'התחילו משחק של שתי דקות עכשיו — בלי חשבון',
    body: 'הכפתור פותח לוח חי כאן בדפדפן. מקבלים שם שחקן זמני שאפשר לשנות בדרך פנימה, ואף אחד לא מבקש אימייל או סיסמה.',
    cta: 'שחקו עכשיו — בלי הרשמה',
    note: 'בלי אימייל · בלי סיסמה · עובד על הרשת של בית הספר',
  },
  es: {
    heading: 'Empieza una partida de 2 minutos ahora — sin cuenta',
    body: 'El botón abre un tablero en vivo en este navegador. Recibes un nombre de jugador temporal que puedes cambiar al entrar, y nadie te pide correo ni contraseña.',
    cta: 'Jugar ahora — sin registro',
    note: 'Sin correo · Sin contraseña · Funciona en el wifi del colegio',
  },
  sv: {
    heading: 'Starta ett tvåminutersspel nu — utan konto',
    body: 'Knappen öppnar en levande spelplan direkt i webbläsaren. Du får ett tillfälligt spelarnamn som går att byta på vägen in, och ingen frågar efter e-post eller lösenord.',
    cta: 'Spela nu — ingen registrering',
    note: 'Ingen e-post · Inget lösenord · Fungerar på skolans wifi',
  },
  ja: {
    heading: '2分のゲームを今すぐ — アカウント不要',
    body: 'ボタンを押すと、このブラウザでライブのボードが開きます。仮のプレイヤー名が割り当てられ、入る途中で変更できます。メールもパスワードも聞かれません。',
    cta: '今すぐプレイ — 登録なし',
    note: 'メール不要 · パスワード不要 · 学校のWi-Fiで動きます',
  },
  ru: {
    heading: 'Начните двухминутную игру прямо сейчас — без аккаунта',
    body: 'Кнопка открывает живое поле прямо в этом браузере. Вы получаете временное имя игрока, которое можно поменять на входе, и никто не просит почту или пароль.',
    cta: 'Играть сейчас — без регистрации',
    note: 'Без почты · Без пароля · Работает на школьном Wi-Fi',
  },
};

/** The one route on the education surface that asks a teacher for nothing. */
export const QUICK_PLAY_PATH = '/multiplayer?quickPlay=true';

export function noAccountCopy(locale: string): NoAccountCopy {
  return COPY[locale.toLowerCase().split('-')[0]] ?? COPY.en;
}

export function NoAccountCta({
  locale,
  className = '',
  copy,
}: {
  locale: string;
  className?: string;
  /** Page-specific wording. Omit for the shared copy above. */
  copy?: NoAccountCopy;
}): React.JSX.Element {
  const c = copy ?? noAccountCopy(locale);
  return (
    <div
      className={`max-w-xl rounded-neo border-4 border-neo-black bg-neo-lime p-5 text-neo-navy shadow-hard-lg sm:p-6 ${className}`}
    >
      <p className="font-neo-display text-lg font-black uppercase leading-[1.05] tracking-tight sm:text-xl">
        {c.heading}
      </p>
      <p className="mt-3 text-sm leading-relaxed sm:text-base">{c.body}</p>
      <Link
        href={`/${locale}${QUICK_PLAY_PATH}`}
        className="mt-4 inline-block rounded-neo border-4 border-neo-black bg-neo-navy px-6 py-3 font-neo-display text-base font-black uppercase tracking-wider text-neo-lime shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg sm:text-lg"
      >
        {c.cta}
      </Link>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest opacity-70">{c.note}</p>
    </div>
  );
}
