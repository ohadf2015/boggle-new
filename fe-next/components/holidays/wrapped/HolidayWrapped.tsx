'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { holidayGet, type HolidayQuery } from '@/lib/holidays/holidayClient';
import type { HolidayWrappedStats } from '@/lib/holidays/wrapped.server';
import { downloadShareImage, shareImageWithNativeShare } from '@/utils/shareImageGenerator';
import { cn } from '@/lib/utils';
import { wrappedSlides } from './wrappedSlides';
import { buildWrappedImage } from './wrappedShareImage';
import '../holidayFx.css';

interface Props {
  holiday: HolidayKey;
  query: HolidayQuery;
  onClose: () => void;
}

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; stats: HolidayWrappedStats };

export default function HolidayWrapped({ holiday, query, onClose }: Props) {
  const { t } = useLanguage();
  const { playSwipeTransitionSound, playAchievementSound } = useSoundEffects();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [tick, setTick] = useState(0);
  const [index, setIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setLoad({ state: 'loading' });
    holidayGet<HolidayWrappedStats>('wrapped', query)
      .then((stats) => {
        if (!alive) return;
        setLoad({ state: 'ready', stats });
        playAchievementSound();
      })
      .catch(() => alive && setLoad({ state: 'error' }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const slides = load.state === 'ready' ? wrappedSlides(load.stats) : [];

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(slides.length - 1, i));
    const dir = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollTo({ left: dir * next * el.clientWidth, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (i !== index) {
      setIndex(i);
      playSwipeTransitionSound();
    }
  };

  const share = async () => {
    if (load.state !== 'ready') return;
    setSharing(true);
    const s = load.stats;
    const image = await buildWrappedImage({
      title: t(`holiday.wrapped.${holiday}.title`),
      art: `/holidays/gift-tier-${holiday === 'hanukkah' ? 8 : 9}.webp`,
      rows: slides
        .filter((sl) => sl.value)
        .map((sl) => ({ value: sl.value, label: t(sl.labelKey, sl.params) })),
      footer: 'lexiclash.live',
    });
    const text = t(`holiday.wrapped.${holiday}.shareText`, { lit: s.lit, total: s.total, words: s.words });
    if (image && !(await shareImageWithNativeShare(image, `${text} https://www.lexiclash.live`))) downloadShareImage(image, `lexiclash-${holiday}-wrapped.png`);
    setSharing(false);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t(`holiday.wrapped.${holiday}.title`)} className="fixed inset-0 z-[90] flex items-center justify-center bg-neo-navy p-4 text-neo-white">
      <div className="relative flex h-full max-h-[640px] w-full max-w-md flex-col rounded-2xl border-[3px] border-black bg-neo-navy-light shadow-hard">
        <header className="flex items-center justify-between gap-2 p-3">
          <h2 className="font-neo-display text-lg font-bold">{t(`holiday.wrapped.${holiday}.title`)}</h2>
          <button type="button" onClick={onClose} aria-label={t('holiday.wrapped.close')} className="rounded-lg border-2 border-black bg-neo-cream p-1 text-neo-navy">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        {load.state === 'loading' && <p className="m-auto text-sm text-neo-white/70">{t('holiday.wrapped.loading')}</p>}
        {load.state === 'error' && (
          <div className="m-auto flex flex-col items-center gap-2 text-sm">
            <p>{t('holiday.wrapped.error')}</p>
            <button type="button" onClick={() => setTick((n) => n + 1)} className="rounded-lg border-2 border-black bg-neo-cream px-3 py-1 font-bold text-neo-navy">
              {t('holiday.event.retry')}
            </button>
          </div>
        )}

        {load.state === 'ready' && (
          <>
            <div
              ref={track}
              data-testid="wrapped-track"
              onScroll={onScroll}
              className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
            >
              {slides.map((sl, i) => (
                <section
                  key={sl.id}
                  data-testid="wrapped-slide"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} / ${slides.length}`}
                  className="flex w-full shrink-0 snap-center flex-col items-center justify-center gap-3 px-6 text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sl.art} alt="" width={160} height={160} className={cn('size-36 object-contain', i === index && 'holiday-pop-in')} />
                  {sl.value && <p className={cn('font-neo-display text-5xl font-bold text-neo-holiday-gold break-all', i === index && 'holiday-card-flip')}>{sl.value}</p>}
                  <p className="font-neo-display text-lg font-bold leading-snug">{t(sl.labelKey, sl.params)}</p>
                  {sl.id === 'finale' && load.stats.titles.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {load.stats.titles.map((id) => (
                        <span key={id} className="rounded-full border-2 border-black bg-neo-holiday-gold px-2 py-0.5 font-neo-display text-xs font-bold text-neo-navy">
                          {t(`holiday.title.${id}`)}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
            <footer className="flex items-center justify-between gap-2 p-3">
              <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} className="rounded-lg border-2 border-black bg-neo-cream px-3 py-1 text-sm font-bold text-neo-navy disabled:opacity-40">
                {t('holiday.wrapped.prev')}
              </button>
              <div className="flex gap-1" aria-hidden="true">
                {slides.map((sl, i) => (
                  <span key={sl.id} className={cn('size-2 rounded-full border border-black', i === index ? 'bg-neo-holiday-gold' : 'bg-neo-white/30')} />
                ))}
              </div>
              {index < slides.length - 1 ? (
                <button type="button" onClick={() => goTo(index + 1)} className="rounded-lg border-2 border-black bg-neo-cream px-3 py-1 text-sm font-bold text-neo-navy">
                  {t('holiday.wrapped.next')}
                </button>
              ) : (
                <button type="button" onClick={share} disabled={sharing} className="rounded-lg border-2 border-black bg-neo-holiday-gold px-3 py-1 text-sm font-bold text-neo-navy shadow-hard-sm">
                  {t('holiday.wrapped.share')}
                </button>
              )}
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
