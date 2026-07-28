'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';

/**
 * FeedbackWidget — floating bubble that opens a small feedback dialog and
 * submits to /api/feedback (same-origin proxy → feedback-devtools ingest).
 *
 * Perf contract:
 * - Renders nothing until the browser is idle (requestIdleCallback), so the
 *   bubble never competes with LCP/hydration.
 * - html2canvas is dynamic-imported ONLY when the user explicitly toggles the
 *   screenshot option — it never lands in the initial bundle.
 * - No animation libraries: CSS transitions only.
 */

type Category = 'bug' | 'idea' | 'ux' | 'other';
type Status = 'idle' | 'sending' | 'done' | 'error';

const CATEGORY_TO_CHANGE_TYPE: Record<Category, string> = {
  bug: 'fix_bug',
  idea: 'add_feature',
  ux: 'improve_ux',
  other: 'other',
};

const MAX_SCREENSHOT_DATAURL_CHARS = 950_000;

interface ScreenshotState {
  dataUrl: string;
  capturing: boolean;
  failed: boolean;
}

async function captureScreenshot(): Promise<string | null> {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const attempts: Array<{ scale: number; quality: number }> = [
      { scale: 0.5, quality: 0.6 },
      { scale: 0.35, quality: 0.5 },
    ];
    for (const { scale, quality } of attempts) {
      const canvas = await html2canvas(document.body, {
        scale,
        useCORS: true,
        logging: false,
        ignoreElements: (el: Element) => el.getAttribute('data-feedback-widget') === 'true',
      });
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_SCREENSHOT_DATAURL_CHARS) {
        return dataUrl;
      }
    }
    return null;
  } catch (err) {
    logger.warn('[FeedbackWidget] Screenshot capture failed', err);
    return null;
  }
}

export default function FeedbackWidget() {
  const { t, language } = useLanguage();
  const pathname = usePathname();
  const isRtl = language === 'he';

  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [screenshot, setScreenshot] = useState<ScreenshotState>({
    dataUrl: '',
    capturing: false,
    failed: false,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Defer first render until the browser is idle — the widget is never on the
  // critical path for LCP.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(() => setReady(true), { timeout: 3000 });
      return () => win.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (open) {
      // Let the open transition start before focusing.
      const id = window.setTimeout(() => textareaRef.current?.focus(), 120);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        posthog.capture('feedback_widget_opened', { locale: language, path: window.location.pathname });
      }
      return next;
    });
  }, [language]);

  const toggleScreenshot = useCallback(async () => {
    if (screenshot.dataUrl || screenshot.capturing) {
      setScreenshot({ dataUrl: '', capturing: false, failed: false });
      return;
    }
    setScreenshot({ dataUrl: '', capturing: true, failed: false });
    // Close the panel visually during capture is NOT needed: ignoreElements
    // already excludes the widget from the shot.
    const dataUrl = await captureScreenshot();
    setScreenshot({ dataUrl: dataUrl || '', capturing: false, failed: !dataUrl });
  }, [screenshot.dataUrl, screenshot.capturing]);

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback-widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changeType: CATEGORY_TO_CHANGE_TYPE[category],
          whatToChange: trimmed,
          authorEmail: email.trim() || undefined,
          screenshotDataUrl: screenshot.dataUrl || undefined,
          pageContext: {
            url: window.location.href,
            title: document.title,
            userAgent: navigator.userAgent,
            locale: language,
            viewport: { width: window.innerWidth, height: window.innerHeight },
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('done');
      // NOTE: no client-side 'feedback_submitted' capture here — the
      // feedback-devtools ingest API emits it server-side so it reaches
      // PostHog even for users who declined analytics consent
      // (opt_out_capturing_by_default drops all client captures).
      // A client capture here would double-count consenting users.
    } catch (err) {
      logger.warn('[FeedbackWidget] Submit failed', err);
      setStatus('error');
      posthog.capture('feedback_submit_failed', { locale: language });
    }
  }, [message, status, category, email, screenshot.dataUrl, language]);

  const resetAndClose = useCallback(() => {
    setOpen(false);
    if (status === 'done') {
      setMessage('');
      setEmail('');
      setCategory('bug');
      setScreenshot({ dataUrl: '', capturing: false, failed: false });
      setStatus('idle');
    }
  }, [status]);

  // CrazyGames embeds prohibit external links/social features — stay hidden there.
  if (!ready || pathname?.includes('crazygames')) {
    return null;
  }

  const categories: Array<{ id: Category; label: string }> = [
    { id: 'bug', label: t('feedbackWidget.categories.bug', 'Report a bug') },
    { id: 'idea', label: t('feedbackWidget.categories.idea', 'Suggest an idea') },
    { id: 'ux', label: t('feedbackWidget.categories.ux', 'Something is confusing') },
    { id: 'other', label: t('feedbackWidget.categories.other', 'Something else') },
  ];

  return (
    <div data-feedback-widget="true" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Floating bubble */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t('feedbackWidget.bubbleLabel', 'Feedback')}
        aria-expanded={open}
        className={[
          'fixed z-[70] end-4',
          'bottom-[calc(var(--bottom-nav-height,0px)+1rem)]',
          'flex items-center gap-2 rounded-full border-2 border-neo-cream/20',
          'bg-neo-black/70 backdrop-blur-sm px-3 py-2 text-neo-white shadow-lg',
          'hover:bg-neo-black/85 hover:border-neo-cream/40 active:scale-95',
          'transition-all duration-200',
          open ? 'scale-90 opacity-0 pointer-events-none' : 'scale-100 opacity-100',
        ].join(' ')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-medium">{t('feedbackWidget.bubbleLabel', 'Feedback')}</span>
      </button>

      {/* Dialog panel */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={t('feedbackWidget.title', 'Send feedback')}
        className={[
          'fixed z-[85] end-4',
          'bottom-[calc(var(--bottom-nav-height,0px)+1rem)]',
          'w-[calc(100vw-2rem)] max-w-sm',
          'rounded-2xl border-2 border-neo-cream/15 bg-neo-black/90 backdrop-blur-md',
          'text-neo-white shadow-2xl',
          'transition-all duration-200 origin-bottom-right',
          open
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-95 opacity-0 translate-y-2 pointer-events-none',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-base font-bold">{t('feedbackWidget.title', 'Send feedback')}</h2>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label={t('feedbackWidget.close', 'Close')}
            className="rounded-full p-1 text-neo-cream/60 hover:text-neo-white hover:bg-neo-cream/10 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {status === 'done' ? (
          <div className="px-4 pb-5 pt-2 text-center">
            <p className="text-lg font-bold mb-1">{t('feedbackWidget.thanksTitle', 'Thanks! 🙏')}</p>
            <p className="text-sm text-neo-cream/70">
              {t('feedbackWidget.thanksBody', 'Your feedback landed with the team.')}
            </p>
            <button
              type="button"
              onClick={resetAndClose}
              className="mt-4 rounded-lg bg-neo-cream/10 px-4 py-2 text-sm font-medium hover:bg-neo-cream/20 transition-colors"
            >
              {t('feedbackWidget.close', 'Close')}
            </button>
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-3">
            {/* Category chips */}
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('feedbackWidget.category', "What's this about?")}>
              {categories.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={category === id}
                  onClick={() => setCategory(id)}
                  className={[
                    'rounded-full px-2.5 py-1 text-xs font-medium border transition-colors',
                    category === id
                      ? 'bg-neo-lime/20 border-neo-lime/50 text-neo-white'
                      : 'bg-neo-cream/5 border-neo-cream/15 text-neo-cream/70 hover:bg-neo-cream/10',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder={t('feedbackWidget.messagePlaceholder', 'What happened? What did you expect?')}
              aria-label={t('feedbackWidget.messageLabel', "Tell us what's on your mind")}
              className="w-full rounded-lg border border-neo-cream/15 bg-neo-cream/5 px-3 py-2 text-sm text-neo-white placeholder:text-neo-cream/40 focus:border-neo-lime/50 focus:outline-none resize-none"
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('feedbackWidget.emailLabel', 'Email (optional — only if you want a reply)')}
              aria-label={t('feedbackWidget.emailLabel', 'Email (optional)')}
              className="w-full rounded-lg border border-neo-cream/15 bg-neo-cream/5 px-3 py-2 text-sm text-neo-white placeholder:text-neo-cream/40 focus:border-neo-lime/50 focus:outline-none"
            />

            {/* Screenshot toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleScreenshot}
                disabled={screenshot.capturing}
                className={[
                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  screenshot.dataUrl
                    ? 'border-neo-lime/50 bg-neo-lime/15 text-neo-white'
                    : 'border-neo-cream/15 bg-neo-cream/5 text-neo-cream/70 hover:bg-neo-cream/10',
                  screenshot.capturing ? 'opacity-50 cursor-wait' : '',
                ].join(' ')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
                </svg>
                {screenshot.capturing
                  ? t('feedbackWidget.screenshotCapturing', 'Capturing…')
                  : screenshot.dataUrl
                    ? t('feedbackWidget.screenshotRemove', 'Remove screenshot')
                    : t('feedbackWidget.screenshot', 'Attach screenshot')}
              </button>
              {screenshot.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={screenshot.dataUrl}
                  alt=""
                  className="h-8 w-12 rounded border border-neo-cream/20 object-cover"
                />
              ) : null}
              {screenshot.failed ? (
                <span className="text-xs text-neo-red/80">
                  {t('feedbackWidget.screenshotFailed', 'Screenshot unavailable')}
                </span>
              ) : null}
            </div>

            {status === 'error' ? (
              <p className="text-xs text-neo-red/90" role="alert">
                {t('feedbackWidget.errorBody', "Couldn't send right now. Please try again.")}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!message.trim() || status === 'sending'}
              className={[
                'w-full rounded-lg py-2.5 text-sm font-bold transition-all',
                'bg-neo-lime/90 text-neo-black hover:bg-neo-lime active:scale-[0.98]',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-neo-lime/90',
              ].join(' ')}
            >
              {status === 'sending'
                ? t('feedbackWidget.sending', 'Sending…')
                : t('feedbackWidget.submit', 'Send feedback')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
