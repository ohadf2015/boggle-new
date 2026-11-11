import { firstName } from './teacherEmailLayout';
import type { TeacherLocale } from '@/lib/education/types';
import { abandonedCheckoutUpgradeUrl, type CheckoutMode } from '@/lib/education/abandonedCheckout';
import { renderNeoEmail, type NeoAccent, type NeoArt } from '@/lib/email/kit/neoEmail';
import { ABANDONED_CHECKOUT_COPY } from './teacherAbandonedCheckout.copy';

/**
 * `keep`: a trial checkout from a teacher still inside the free access trial. They
 * already have the trial, so the email asks them to keep Pro when it ends rather
 * than "start a free 14-day trial" a second time.
 * `ended`: the teacher's free access trial is over, so no trial is offered at all:
 * continue with Teacher Pro at $9/mo.
 */
export type AbandonedCheckoutEmailMode = CheckoutMode | 'keep' | 'ended';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  mode: AbandonedCheckoutEmailMode;
}

const CONTACT = 'ohadf2015@gmail.com';

const LOOK: Record<AbandonedCheckoutEmailMode, { accent: NeoAccent; art: NeoArt }> = {
  paid: { accent: 'cyan', art: 'welcome' },
  trial: { accent: 'lime', art: 'welcome' },
  keep: { accent: 'purple', art: 'hourglass' },
  ended: { accent: 'pink', art: 'miss-you' },
};

export function teacherAbandonedCheckout({ full_name, locale, mode }: Args) {
  const c = ABANDONED_CHECKOUT_COPY[locale] || ABANDONED_CHECKOUT_COPY.en;
  const m = c.modes[mode];

  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: m.preheader,
    ...LOOK[mode],
    kicker: c.kicker,
    headline: m.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks: [
      { type: 'p', text: m.lead, strong: true },
      { type: 'p', text: c.body },
      { type: 'callout', title: c.priceTitle, text: c.price },
      { type: 'p', text: c.ask },
    ],
    cta: { label: m.cta, href: abandonedCheckoutUpgradeUrl(locale) },
    signoff: c.signoff,
  });

  return { subject: m.subject, html, replyTo: CONTACT };
}
