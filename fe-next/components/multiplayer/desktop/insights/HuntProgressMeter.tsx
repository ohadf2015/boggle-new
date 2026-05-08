import { useLanguage } from '@/contexts/LanguageContext';
import { ThemedPanel } from '../ThemedPanel';
import { getMpTheme } from '@/lib/multiplayer/desktopThemes';
import type { MpDesktopMode } from '../types';

interface HuntProgressMeterProps {
  mode: MpDesktopMode;
  found: number;
  target: number;
}

export function HuntProgressMeter({ mode, found, target }: HuntProgressMeterProps) {
  const { t } = useLanguage();
  const theme = getMpTheme(mode);
  const safeTarget = Math.max(1, target);
  const pct = Math.min(100, Math.round((found / safeTarget) * 100));
  return (
    <ThemedPanel
      mode={mode}
      variant="rail"
      header={t('mp.insights.huntProgressHeader')}
      headerRight={`${found}/${target}`}
      testId="hunt-progress-meter"
    >
      <div
        className="h-2 bg-foreground/10 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          data-testid="hunt-progress-fill"
          className={`h-full rounded-full transition-all duration-500 ${theme.bgTintClass.replace('/5', '/40')} ${theme.borderClass.replace('border-', 'bg-')}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </ThemedPanel>
  );
}
