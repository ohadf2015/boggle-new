'use client';

import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ClassroomInvitePresenterProps {
  joinCode: string;
  joinUrl: string;
  classroomName: string;
  onClose: () => void;
}

/**
 * Full-screen "project this on the board" surface: the join URL, the code big
 * enough to read from the back row, and a QR for phones.
 *
 * Dark-only by construction — it is hardcoded `bg-neo-navy` rather than
 * `bg-neo-cream dark:bg-neo-navy`, because the dark class resolves after mount
 * on a lazily-rendered fullscreen layer and the cream flashes first.
 */
export default function ClassroomInvitePresenter({
  joinCode,
  joinUrl,
  classroomName,
  onClose,
}: ClassroomInvitePresenterProps) {
  const { t, language } = useLanguage();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      data-testid="presenter-surface"
      dir={language === 'he' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[70] bg-neo-navy text-neo-white flex flex-col items-center justify-center px-6 py-10 overflow-y-auto"
    >
      <div className="absolute top-4 end-4">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('teacher.classroom.presenter.exit')}
          className="flex items-center gap-2 bg-neo-pink text-black font-neo-display font-black text-sm px-4 py-2 rounded-neo border-neo border-black shadow-hard hover:-translate-y-0.5 transition-transform"
        >
          <X className="w-4 h-4" />
          {t('teacher.classroom.presenter.exit')}
        </button>
      </div>

      <h1 className="font-neo-display font-black text-2xl md:text-4xl text-neo-lime text-center mb-8">
        {classroomName}
      </h1>

      <p className="font-neo-body font-bold text-neo-white/70 text-lg md:text-2xl mb-2">
        {t('teacher.classroom.presenter.visitUrl')}
      </p>
      <p className="font-neo-display font-black text-xl md:text-3xl break-all text-center mb-10">
        {joinUrl}
      </p>

      <p className="font-neo-body font-bold text-neo-white/70 text-lg md:text-2xl mb-3">
        {t('teacher.classroom.presenter.orEnterCode')}
      </p>
      <div
        data-testid="code-display"
        className="font-neo-display font-black text-6xl md:text-8xl tracking-[0.2em] bg-neo-lime text-black px-8 py-6 rounded-neo border-neo-thick border-black shadow-hard-lg mb-10"
      >
        {joinCode}
      </div>

      <p className="font-neo-body font-bold text-neo-white/70 text-base md:text-xl mb-3">
        {t('teacher.classroom.presenter.scanQr')}
      </p>
      <div className="bg-white p-4 rounded-neo border-neo-thick border-black shadow-hard mb-8">
        <QRCodeSVG value={joinUrl} size={200} level="M" bgColor="#ffffff" fgColor="#000000" />
      </div>

      <p className="font-neo-body text-neo-white/60 text-sm md:text-base text-center max-w-xl mb-2">
        {t('teacher.classroom.presenter.shareTip')}
      </p>
      <p className="font-neo-body text-neo-white/40 text-xs md:text-sm">
        {t('teacher.classroom.presenter.pressEscape')}
      </p>
    </div>
  );
}
