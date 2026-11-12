'use client';

import type { ReactNode } from 'react';
import { getCachedTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';

/** Context-free copy: an error boundary must render even when the provider that threw is the language one. */
export function readCachedCopy(locale: string, path: string, fallback: string): string {
  try {
    let node: unknown = getCachedTranslation(locale as Language) || getCachedTranslation('en');
    for (const key of path.split('.')) {
      node = (node as Record<string, unknown> | undefined)?.[key];
    }
    return typeof node === 'string' && node ? node : fallback;
  } catch {
    return fallback;
  }
}

const PRESS =
  'transition-[translate,box-shadow] duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ' +
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy-light';

export const ERROR_CARD_PRIMARY_BUTTON = `flex min-h-[56px] w-full items-center justify-center rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 font-neo-display text-lg font-black text-neo-black shadow-hard ${PRESS}`;

export const ERROR_CARD_SECONDARY_BUTTON = `flex min-h-[48px] w-full items-center justify-center rounded-neo border-[3px] border-neo-cream bg-neo-navy px-4 font-neo-display text-base font-bold text-neo-cream ${PRESS}`;

export function ErrorCardShell({
  testId,
  mascot,
  heading,
  body,
  children,
}: {
  testId?: string;
  mascot?: ReactNode;
  heading: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      role="alert"
      className="flex h-dvh w-full flex-1 items-center justify-center overflow-y-auto bg-neo-navy px-4 py-8"
    >
      <div className="w-full max-w-sm rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light p-6 text-center shadow-hard-lg">
        {mascot}
        <h1 className="mb-2 font-neo-display text-2xl font-black text-neo-cream">{heading}</h1>
        <p className="mb-6 font-neo-body text-base font-semibold text-neo-cream/85">{body}</p>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </div>
  );
}

/** "Update ready" screen shown when a deploy left this tab with files the server no longer has. */
export function StaleDeployScreen({
  locale,
  onRefresh,
  mascot,
  secondary,
  testId = 'stale-deploy-screen',
  refreshTestId = 'stale-deploy-refresh',
}: {
  locale: string;
  onRefresh: () => void;
  mascot?: ReactNode;
  secondary?: { label: string; onClick: () => void; testId?: string };
  testId?: string;
  refreshTestId?: string;
}) {
  return (
    <ErrorCardShell
      testId={testId}
      mascot={mascot}
      heading={readCachedCopy(locale, 'errors.updateHeading', 'Update ready')}
      body={readCachedCopy(locale, 'errors.updateMessage', 'New version available. Refresh to update.')}
    >
      <button type="button" data-testid={refreshTestId} onClick={onRefresh} className={ERROR_CARD_PRIMARY_BUTTON}>
        {readCachedCopy(locale, 'errors.refreshPage', 'Refresh')}
      </button>
      {secondary && (
        <button type="button" data-testid={secondary.testId} onClick={secondary.onClick} className={ERROR_CARD_SECONDARY_BUTTON}>
          {secondary.label}
        </button>
      )}
    </ErrorCardShell>
  );
}
