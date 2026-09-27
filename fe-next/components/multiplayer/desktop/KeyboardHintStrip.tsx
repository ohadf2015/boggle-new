import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Reference strip showing the three keyboard input shortcuts in the desktop
 * shell's right rail. Static — does not actually wire the hotkeys (those live
 * in `useKeyboardWordInput`). Promotes discoverability of typing as input.
 */
export function KeyboardHintStrip() {
  const { t } = useLanguage();
  const items = [
    { key: 'Enter', label: t('mp.kbHint.submit'), id: 'submit' },
    { key: 'Backspace', label: t('mp.kbHint.pop'), id: 'pop' },
    { key: 'Esc', label: t('mp.kbHint.clear'), id: 'clear' },
  ];
  return (
    <div className="flex gap-2 flex-wrap p-2 text-xs" data-component="kb-hint-strip">
      {items.map(item => (
        <span
          key={item.id}
          data-testid={`kb-hint-${item.id}`}
          className="inline-flex items-center gap-1 px-2 py-1 border-2 border-foreground rounded bg-card"
        >
          <kbd className="font-mono font-bold">{item.key}</kbd>
          <span className="opacity-70">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
