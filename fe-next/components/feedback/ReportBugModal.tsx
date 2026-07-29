'use client';

import { useCallback, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Bug, Lightbulb, MessageSquare, Send, ChevronDown, CheckCircle2, Camera, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';

interface ReportBugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';
export type FeedbackType = 'bug' | 'feature' | 'general';

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_SCREENSHOT_DATAURL_CHARS = 950_000;

interface DeviceMetadata {
  url: string;
  screen: string;
  touch: number;
  platform: string;
  connection: string;
}

/** Collect device/context metadata once per open — cheap reads, no layout work. */
function collectDeviceMetadata(): DeviceMetadata {
  if (typeof window === 'undefined') {
    return { url: '', screen: '', touch: 0, platform: '', connection: '' };
  }
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
    maxTouchPoints?: number;
  };
  return {
    url: window.location.href,
    screen: `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio}x`,
    touch: nav.maxTouchPoints ?? 0,
    platform: nav.platform ?? '',
    connection: nav.connection?.effectiveType ?? '',
  };
}

/**
 * Screenshot capture — two strategies, ordered by jank:
 *
 * 1. NATIVE (getDisplayMedia): OS-level capture. No DOM re-render, zero main-
 *    thread cost, and it actually captures WebGL/canvas game content (which
 *    html2canvas renders blank or tainted). Requires one user pick in the
 *    browser's tab picker. Unsupported on iOS Safari → falls through.
 * 2. DOM (html2canvas): re-renders the page to a canvas ON the main thread.
 *    On the in-game screen (PIXI canvas, particles, AdMob iframes, animated
 *    HUD) a naive full-body capture can block for seconds or hang entirely.
 *    Guardrails: dynamic-import only on opt-in, per-attempt hard timeout,
 *    two tiers (full → heavy-elements-excluded), downscaled output.
 *
 * Dialogs + the FAB are hidden during capture via the `feedback-capturing`
 * html class (see globals.css) so the shot shows the page state the player
 * is reporting about, not the modal.
 */
const CAPTURE_TIMEOUT_MS = 8_000;
const CAPTURE_MAX_WIDTH = 1280;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    work,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}

/** Downscale to CAPTURE_MAX_WIDTH and encode as JPEG; null on tainted canvas. */
function canvasToJpeg(source: HTMLCanvasElement, quality: number): string | null {
  try {
    let canvas = source;
    if (source.width > CAPTURE_MAX_WIDTH) {
      const scaled = document.createElement('canvas');
      scaled.width = CAPTURE_MAX_WIDTH;
      scaled.height = Math.round((source.height * CAPTURE_MAX_WIDTH) / source.width);
      scaled.getContext('2d')?.drawImage(source, 0, 0, scaled.width, scaled.height);
      canvas = scaled;
    }
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return dataUrl.length <= MAX_SCREENSHOT_DATAURL_CHARS ? dataUrl : null;
  } catch {
    return null;
  }
}

/** Native screen capture. Returns null when unsupported or the user cancels. */
class CaptureCancelled extends Error {}

async function captureNative(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
    return null;
  }
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 1 },
      audio: false,
      // Chrome hints: default the picker to the current tab.
      ...({ preferCurrentTab: true, selfBrowserSurface: 'include' } as Record<string, unknown>),
    } as DisplayMediaStreamOptions);
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = stream;
    await video.play();
    if (!video.videoWidth) {
      await withTimeout(
        new Promise<void>((resolve) => {
          video.addEventListener('loadeddata', () => resolve(), { once: true });
        }),
        2_000,
      );
    }
    if (!video.videoWidth || !video.videoHeight) return null;
    const frame = document.createElement('canvas');
    frame.width = video.videoWidth;
    frame.height = video.videoHeight;
    frame.getContext('2d')?.drawImage(video, 0, 0);
    return canvasToJpeg(frame, 0.7);
  } catch (err) {
    // User dismissed the tab picker → honour it, don't fall back to DOM capture.
    if ((err as DOMException)?.name === 'NotAllowedError') {
      throw new CaptureCancelled();
    }
    return null;
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

/** html2canvas capture with hard timeout; `skipHeavy` excludes canvas/video. */
async function captureDom(scale: number, skipHeavy: boolean): Promise<string | null> {
  const { default: html2canvas } = await import('html2canvas');
  const work = html2canvas(document.body, {
    scale,
    useCORS: true,
    logging: false,
    ignoreElements: (el: Element) => {
      if (el.getAttribute('data-feedback-fab') === 'true') return true;
      const tag = el.tagName;
      // Cross-origin iframes (AdMob) are always dead weight in a bug shot.
      if (tag === 'IFRAME') return true;
      // Tier 2: canvas/video are the main freeze sources (and WebGL captures
      // blank anyway without preserveDrawingBuffer).
      return skipHeavy && (tag === 'CANVAS' || tag === 'VIDEO');
    },
  });
  const canvas = await withTimeout(work, CAPTURE_TIMEOUT_MS);
  if (!canvas) return null;
  return canvasToJpeg(canvas, skipHeavy ? 0.5 : 0.6);
}

async function captureScreenshot(): Promise<string | null> {
  document.documentElement.classList.add('feedback-capturing');
  try {
    // Let the overlay-hide paint before any capture path reads the screen.
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined)));
    });
    const native = await captureNative();
    if (native) return native;
    const tiers: Array<[number, boolean]> = [
      [0.4, false],
      [0.3, true],
    ];
    for (const [scale, skipHeavy] of tiers) {
      try {
        const dataUrl = await captureDom(scale, skipHeavy);
        if (dataUrl) return dataUrl;
      } catch (err) {
        logger.warn('[ReportBugModal] DOM capture tier failed', { scale, skipHeavy, err });
      }
    }
    return null;
  } catch (err) {
    if (err instanceof CaptureCancelled) return null;
    logger.warn('[ReportBugModal] Screenshot capture failed', err);
    return null;
  } finally {
    document.documentElement.classList.remove('feedback-capturing');
  }
}

/**
 * Feedback modal ("Report a bug" / suggest a feature / general). Auto-captures
 * page URL, device metadata (viewport, screen, DPR, touch, platform, network),
 * locale and (if signed in) user id so reports are actionable, with an optional
 * opt-in screenshot, then POSTs to /api/feedback which fans out to Supabase +
 * Telegram + email. Everything auto-attached is shown in a disclosure so the
 * user knows exactly what's sent.
 */
export function ReportBugModal({ isOpen, onClose }: ReportBugModalProps) {
  const { t, dir, language } = useLanguage();
  const { user } = useAuth();
  const pathname = usePathname();

  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [showDetails, setShowDetails] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [screenshotFailed, setScreenshotFailed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = message.trim();
  const canSubmit = trimmed.length >= MIN_MESSAGE_LENGTH && status !== 'submitting' && !capturing;

  const page = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
  const browser = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const device = collectDeviceMetadata();

  const handleClose = useCallback(() => {
    setType('bug');
    setMessage('');
    setStatus('idle');
    setShowDetails(false);
    setRewarded(false);
    setScreenshot(null);
    setCapturing(false);
    setScreenshotFailed(false);
    onClose();
  }, [onClose]);

  const handleAttachScreenshot = useCallback(async () => {
    setCapturing(true);
    setScreenshotFailed(false);
    // Outer safety net: even if every inner guard fails, the UI unsticks.
    const dataUrl = await withTimeout(captureScreenshot(), 30_000);
    document.documentElement.classList.remove('feedback-capturing');
    setCapturing(false);
    if (dataUrl) {
      setScreenshot(dataUrl);
    } else {
      setScreenshotFailed(true);
    }
  }, []);

  /**
   * Sync state from a raw value (shared by change/input/compositionEnd handlers).
   * Android GBoard in Hebrew buffers composition; onChange alone can leave React
   * state empty while the DOM value already has text.
   */
  const syncMessage = useCallback((raw: string) => {
    setMessage(raw.slice(0, MAX_MESSAGE_LENGTH));
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    syncMessage(e.target.value);
  }, [syncMessage]);

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    syncMessage(e.currentTarget.value);
  }, [syncMessage]);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    syncMessage(e.currentTarget.value);
  }, [syncMessage]);

  const handleCompositionUpdate = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    syncMessage(e.currentTarget.value);
  }, [syncMessage]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    syncMessage(e.currentTarget.value);
  }, [syncMessage]);

  const handleSubmit = useCallback(async () => {
    // Read DOM value directly — it is the source of truth during IME composition
    const raw = textareaRef.current?.value ?? message;
    const textTrimmed = raw.trim();
    if (textTrimmed.length < MIN_MESSAGE_LENGTH) return;

    setStatus('submitting');
    try {
      const meta = collectDeviceMetadata();
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textTrimmed,
          type,
          page,
          url: meta.url,
          userAgent: browser,
          userId: user?.id ?? null,
          locale: language,
          viewport:
            typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
          screen: meta.screen,
          touch: meta.touch,
          platform: meta.platform,
          connection: meta.connection,
          appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '',
          screenshotDataUrl: screenshot ?? undefined,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      const data = await res.json().catch(() => ({}));
      setRewarded(data.rewarded ?? false);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }, [message, type, page, browser, user, language, screenshot]);

  const TYPE_OPTIONS: Array<{ value: FeedbackType; icon: typeof Bug; label: string }> = [
    { value: 'bug', icon: Bug, label: t('bugReport.typeBug', 'Bug') },
    { value: 'feature', icon: Lightbulb, label: t('bugReport.typeFeature', 'Feature idea') },
    { value: 'general', icon: MessageSquare, label: t('bugReport.typeGeneral', 'General') },
  ];

  const titleKey =
    type === 'feature'
      ? 'bugReport.titleFeature'
      : type === 'general'
        ? 'bugReport.titleGeneral'
        : 'bugReport.title';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent noDescription className="max-w-md" dir={dir}>
        <DialogHeader className="bg-linear-to-r from-neo-pink via-neo-pink to-neo-purple text-neo-white p-4 sm:p-5 relative overflow-hidden">
          <Bug className="absolute top-2 right-3 rtl:right-auto rtl:left-3 w-5 h-5 text-neo-white" aria-hidden="true" />
          <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            {t(titleKey, t('bugReport.title'))}
          </DialogTitle>
          <p className="text-sm text-neo-white mt-1">{t('bugReport.description')}</p>
        </DialogHeader>

        {status === 'success' ? (
          <DialogBody className="px-4 sm:px-5 py-8 text-center">
            <CheckCircle2 className="w-14 h-14 mx-auto text-neo-lime mb-3" aria-hidden="true" />
            <p className="text-base font-bold text-neo-white">{t('bugReport.success')}</p>
            {rewarded && (
              <p className="text-sm text-neo-yellow mt-2">
                {t('bugReport.rewardEarned', { xp: 100 })}
              </p>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="mt-5 px-6 py-2.5 bg-neo-lime text-neo-black font-black uppercase text-sm border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
            >
              {t('bugReport.close')}
            </button>
          </DialogBody>
        ) : (
          <>
            <DialogBody className="px-4 sm:px-5 py-4 space-y-3">
              {/* Type selector: bug / feature / general */}
              <div role="radiogroup" aria-label={t('bugReport.typeLabel', 'Feedback type')} className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={type === value}
                    onClick={() => setType(value)}
                    className={cn(
                      'flex flex-col items-center gap-1 px-2 py-2 rounded-neo border-2 text-xs font-bold transition-colors',
                      type === value
                        ? 'bg-neo-yellow text-neo-black border-neo-black shadow-hard-sm'
                        : 'bg-neo-navy-light text-neo-white border-neo-black/40 hover:border-neo-black'
                    )}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>

              <label htmlFor="bug-report-message" className="block text-sm font-bold text-neo-white">
                {type === 'feature' ? t('bugReport.whatFeature', t('bugReport.whatHappened')) : t('bugReport.whatHappened')}
              </label>
              <textarea
                ref={textareaRef}
                id="bug-report-message"
                value={message}
                onChange={handleChange}
                onInput={handleInput}
                onCompositionEnd={handleCompositionEnd}
                onCompositionUpdate={handleCompositionUpdate}
                onKeyUp={handleKeyUp}
                placeholder={type === 'feature' ? t('bugReport.placeholderFeature', t('bugReport.placeholder')) : t('bugReport.placeholder')}
                rows={5}
                dir={dir}
                className="w-full p-3 bg-neo-navy-light text-neo-white border-2 border-neo-black/60 rounded-neo resize-none focus:outline-none focus:border-neo-pink placeholder:text-neo-white"
              />

              {message.trim().length > 0 && message.trim().length < MIN_MESSAGE_LENGTH && (
                <p className="text-xs text-neo-white">{t('bugReport.minLengthHint')}</p>
              )}

              {/* Opt-in screenshot */}
              <div className="flex items-center gap-2">
                {screenshot ? (
                  <div className="flex items-center gap-2 w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL thumbnail */}
                    <img
                      src={screenshot}
                      alt={t('bugReport.screenshotAttached', 'Screenshot attached')}
                      className="h-12 w-auto rounded-neo border-2 border-neo-black/60"
                    />
                    <button
                      type="button"
                      onClick={() => setScreenshot(null)}
                      className="inline-flex items-center gap-1 text-xs text-neo-white hover:text-neo-red"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('bugReport.removeScreenshot', 'Remove')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAttachScreenshot}
                    disabled={capturing}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-neo-white hover:text-neo-yellow disabled:opacity-50"
                  >
                    {capturing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {capturing
                      ? t('bugReport.capturingScreenshot', 'Capturing…')
                      : t('bugReport.attachScreenshot', 'Attach screenshot')}
                  </button>
                )}
                {screenshotFailed && (
                  <span className="text-xs text-neo-white">{t('bugReport.screenshotFailed', 'Capture failed')}</span>
                )}
              </div>

              {status === 'error' && (
                <p role="alert" className="text-sm font-bold text-neo-red">
                  {t('bugReport.error')}
                </p>
              )}

              {/* Transparency: show what we auto-attach */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  className="flex items-center gap-1 text-xs text-neo-white hover:text-neo-white"
                >
                  <ChevronDown
                    className={cn('w-3.5 h-3.5 transition-transform', showDetails && 'rotate-180')}
                    aria-hidden="true"
                  />
                  {t('bugReport.sessionInfo')}
                </button>
                {showDetails && (
                  <dl className="mt-2 text-xs text-neo-white space-y-1 bg-neo-navy/60 rounded-neo p-2.5 border border-neo-black/40">
                    <div className="flex gap-2">
                      <dt className="font-bold shrink-0">{t('bugReport.currentPage')}:</dt>
                      <dd className="truncate">{device.url || page || '—'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-bold shrink-0">{t('bugReport.viewport', 'Viewport')}:</dt>
                      <dd>{typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '—'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-bold shrink-0">{t('bugReport.screen', 'Screen')}:</dt>
                      <dd>{device.screen || '—'}</dd>
                    </div>
                    {device.connection && (
                      <div className="flex gap-2">
                        <dt className="font-bold shrink-0">{t('bugReport.connection', 'Network')}:</dt>
                        <dd>{device.connection}</dd>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <dt className="font-bold shrink-0">{t('bugReport.userId')}:</dt>
                      <dd className="truncate">{user?.id ?? '—'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-bold shrink-0">{t('bugReport.browserInfo')}:</dt>
                      <dd className="truncate">{browser || '—'}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </DialogBody>

            <DialogFooter className="px-4 sm:px-5 pb-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 bg-transparent text-neo-white font-bold uppercase text-sm hover:text-neo-white"
              >
                {t('bugReport.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-neo-pink text-neo-white font-black uppercase text-sm border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                {status === 'submitting' ? t('bugReport.submitting') : t('bugReport.submit')}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReportBugModal;
