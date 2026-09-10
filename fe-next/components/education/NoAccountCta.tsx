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
 * The promise is verified, not assumed: the destination is
 * `/education/classroom-game`, which renders `ClassroomGuestDemo` for guests
 * (class-code join → `/join/[code]` → display name, no email). Do not claim a
 * live board or a temporary player name here — that was the consumer
 * quick-play path this CTA used to dump into.
 */

export type NoAccountCopy = { heading: string; body: string; cta: string; note: string };

const COPY: Record<string, NoAccountCopy> = {
  en: {
    heading: 'Join a class game right now — no account',
    body: 'The button opens the classroom game in this browser. Enter a class code and a display name to jump in. Nothing asks for an email or a password.',
    cta: 'Play now — no sign-up',
    note: 'No email · No password · Runs on the school Wi-Fi',
  },
  he: {
    heading: 'הצטרפו למשחק כיתה עכשיו — בלי חשבון',
    body: 'הכפתור פותח את משחק הכיתה בדפדפן. מזינים קוד כיתה ושם תצוגה כדי להיכנס. אף אחד לא מבקש אימייל או סיסמה.',
    cta: 'שחקו עכשיו — בלי הרשמה',
    note: 'בלי אימייל · בלי סיסמה · עובד על הרשת של בית הספר',
  },
  es: {
    heading: 'Entra a un juego de clase ahora — sin cuenta',
    body: 'El botón abre el juego de clase en este navegador. Escribe un código de clase y un nombre para entrar. Nadie te pide correo ni contraseña.',
    cta: 'Jugar ahora — sin registro',
    note: 'Sin correo · Sin contraseña · Funciona en el wifi del colegio',
  },
  sv: {
    heading: 'Gå med i ett klasspel nu — utan konto',
    body: 'Knappen öppnar klasspelet i webbläsaren. Ange en klasskod och ett visningsnamn för att hoppa in. Ingen frågar efter e-post eller lösenord.',
    cta: 'Spela nu — ingen registrering',
    note: 'Ingen e-post · Inget lösenord · Fungerar på skolans wifi',
  },
  ja: {
    heading: 'クラスゲームに今すぐ参加 — アカウント不要',
    body: 'ボタンを押すと、このブラウザでクラスゲームが開きます。クラスコードと表示名を入力して参加できます。メールもパスワードも聞かれません。',
    cta: '今すぐプレイ — 登録なし',
    note: 'メール不要 · パスワード不要 · 学校のWi-Fiで動きます',
  },
  ru: {
    heading: 'Присоединитесь к игре класса прямо сейчас — без аккаунта',
    body: 'Кнопка открывает игру для класса в этом браузере. Введите код класса и имя, чтобы войти. Никто не просит почту или пароль.',
    cta: 'Играть сейчас — без регистрации',
    note: 'Без почты · Без пароля · Работает на школьном Wi-Fi',
  },
};

/** The one route on the education surface that asks a teacher for nothing. */
export const QUICK_PLAY_PATH = '/education/classroom-game';

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
