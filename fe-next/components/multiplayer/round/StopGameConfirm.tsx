'use client';

/** Host "end the game for everyone?" confirmation — one copy for every mode. */
export function StopGameConfirm({
  open,
  t,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  t: (key: string) => string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-neo-navy border-4 border-neo-black shadow-hard-lg p-6 max-w-xs w-full text-center rounded-neo">
        <p className="font-bold text-neo-cream text-lg mb-4 font-neo-display">{t('mp.stopGameConfirm')}</p>
        <div className="flex gap-3 justify-center">
          <button type="button" onClick={onConfirm} className="bg-neo-pink border-2 border-neo-black font-black px-4 py-2 text-neo-black rounded-neo hover:shadow-hard active:shadow-hard-pressed transition-all">
            {t('mp.stopGameYes')}
          </button>
          <button type="button" onClick={onCancel} className="bg-neo-cream border-2 border-neo-black font-black px-4 py-2 text-neo-black rounded-neo hover:shadow-hard active:shadow-hard-pressed transition-all">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
