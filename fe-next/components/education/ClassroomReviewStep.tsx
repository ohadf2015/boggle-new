import { Users, Copy, Check, ChevronDown, ChevronUp, LayoutGrid, Search, Zap } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { WizardStep } from '@/components/ui/WizardStep';

interface GameSettings {
  timerMinutes: number;
  boardSize: 'small' | 'medium' | 'large';
  allowLateJoin: boolean;
}

type GameMode = 'classic' | 'wordHunt' | 'blast';

interface ClassroomReviewStepProps {
  gameCode: string;
  joinUrl: string;
  copied: boolean;
  isStarting: boolean;
  settings: GameSettings;
  showAdvanced: boolean;
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
  onCopyCode: () => void;
  onStartGame: () => void;
  onBack: () => void;
  onToggleAdvanced: () => void;
  onSettingsChange: (settings: GameSettings) => void;
}

function getBoardSizeLabel(size: string) {
  switch (size) {
    case 'small': return '4x4';
    case 'medium': return '5x5';
    case 'large': return '6x6';
    default: return '5x5';
  }
}

const GAME_MODES: { key: GameMode; icon: typeof LayoutGrid; color: string }[] = [
  { key: 'classic', icon: LayoutGrid, color: 'neo-cyan' },
  { key: 'wordHunt', icon: Search, color: 'neo-yellow' },
  { key: 'blast', icon: Zap, color: 'neo-pink' },
];

export function ClassroomReviewStep({
  gameCode,
  joinUrl,
  copied,
  isStarting,
  settings,
  showAdvanced,
  gameMode,
  onGameModeChange,
  onCopyCode,
  onStartGame,
  onBack,
  onToggleAdvanced,
  onSettingsChange,
}: ClassroomReviewStepProps) {
  const { t } = useLanguage();

  return (
    <WizardStep
      currentStep={2}
      totalSteps={2}
      title={t('education.classroomGame.reviewAndStart')}
      description={t('education.classroomGame.shareCodeWithStudents')}
      onNext={onStartGame}
      onBack={onBack}
      nextLabel={t('education.classroomGame.startGame')}
      isLoading={isStarting}
    >
      <div className="space-y-6">
        {/* Game Mode Selector */}
        <div className="p-4 rounded-neo border-neo border-neo-black bg-neo-navy/50">
          <h4 className="text-neo-white font-bold mb-3">
            {t('teacher.classroom.gameModes.title')}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {GAME_MODES.map(({ key, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => onGameModeChange(key)}
                className={cn(
                  'flex flex-col items-center gap-2 px-4 py-3 font-bold rounded-neo border-neo border-neo-black transition-all',
                  gameMode === key
                    ? `bg-${color} text-neo-black shadow-hard`
                    : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm">{t(`classroom.gameModes.${key}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Game Code */}
        <div className="p-6 rounded-neo border-neo border-neo-cyan bg-neo-cyan/20 shadow-hard-lg">
          <p className="text-sm text-neo-white/70 font-neo-body mb-2 text-center">
            {t('education.classroomGame.shareCode')}
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-5xl font-black text-neo-cyan tracking-widest font-mono">
              {gameCode}
            </span>
            <button
              onClick={onCopyCode}
              className={cn(
                'p-3 rounded-neo border-neo border-neo-black',
                'bg-neo-cream text-neo-black',
                'shadow-hard hover:shadow-hard-lg',
                'transition-all',
                copied && 'bg-neo-lime'
              )}
              aria-label={t('share.copy')}
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 px-4 py-2 rounded-neo border-neo border-neo-black bg-neo-navy/50">
            <Users className="w-5 h-5 text-neo-cyan" />
            <span className="text-neo-white font-bold text-sm">
              {t('education.classroomGame.waitingForPlayers')}
            </span>
          </div>

          {/* QR code */}
          {joinUrl && (
            <div className="flex flex-col items-center gap-2 mt-4">
              <p className="text-xs text-neo-white/60 font-neo-body">
                {t('education.classroomGame.scanToJoin')}
              </p>
              <div className="p-2 bg-white rounded-neo border-neo border-neo-black shadow-hard-sm">
                <QRCodeCanvas value={joinUrl} size={180} bgColor="#ffffff" fgColor="#000000" level="M" />
              </div>
            </div>
          )}
        </div>

        {/* Smart Defaults Summary */}
        <div className="p-4 rounded-neo border-neo border-neo-black bg-neo-navy/50">
          <h4 className="text-neo-white font-bold mb-3">
            {t('education.classroomGame.gameSettings')}
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-neo-white/50 text-xs mb-1">{t('education.template.timer')}</p>
              <p className="text-neo-white font-bold">{settings.timerMinutes} {t('common.minutes')}</p>
            </div>
            <div>
              <p className="text-neo-white/50 text-xs mb-1">{t('education.template.boardSize')}</p>
              <p className="text-neo-white font-bold">{getBoardSizeLabel(settings.boardSize)}</p>
            </div>
            <div>
              <p className="text-neo-white/50 text-xs mb-1">{t('education.template.lateJoin')}</p>
              <p className="text-neo-white font-bold">{settings.allowLateJoin ? '✓' : '✗'}</p>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={onToggleAdvanced}
            className={cn(
              'w-full mt-4 px-4 py-2 rounded-neo',
              'border-neo border-neo-black bg-neo-navy/30',
              'text-neo-white font-bold text-sm',
              'hover:bg-neo-navy transition-all',
              'flex items-center justify-center gap-2'
            )}
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {t('common.hideAdvanced')}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {t('common.showAdvanced')}
              </>
            )}
          </button>

          {/* Advanced Settings (Collapsed) */}
          {showAdvanced && (
            <div className="mt-4 space-y-4 pt-4 border-t border-neo-white/10">
              {/* Timer */}
              <div>
                <label className="block text-sm text-neo-white/70 mb-2">
                  {t('education.template.timer')}
                </label>
                <select
                  value={settings.timerMinutes}
                  onChange={(e) => onSettingsChange({ ...settings, timerMinutes: Number(e.target.value) })}
                  className={cn(
                    'w-full px-4 py-2 bg-neo-navy border-neo border-neo-black',
                    'text-neo-white font-neo-body shadow-hard-sm rounded-neo',
                    'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
                  )}
                  role="combobox"
                >
                  <option value={2}>2 {t('common.minutes')}</option>
                  <option value={3}>3 {t('common.minutes')}</option>
                  <option value={5}>5 {t('common.minutes')}</option>
                  <option value={10}>10 {t('common.minutes')}</option>
                </select>
              </div>

              {/* Board Size */}
              <div>
                <label className="block text-sm text-neo-white/70 mb-2">
                  {t('education.template.difficulty')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => onSettingsChange({ ...settings, boardSize: size })}
                      className={cn(
                        'px-4 py-2 font-bold rounded-neo border-neo border-neo-black transition-all',
                        settings.boardSize === size
                          ? 'bg-neo-cyan text-neo-black shadow-hard'
                          : 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy shadow-hard-sm'
                      )}
                    >
                      {getBoardSizeLabel(size)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Late Join */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neo-white font-bold text-sm">
                    {t('education.template.allowLateJoin')}
                  </p>
                  <p className="text-xs text-neo-white/50">
                    {t('education.template.allowLateJoinDesc')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowLateJoin}
                  onChange={(e) => onSettingsChange({ ...settings, allowLateJoin: e.target.checked })}
                  className="w-6 h-6 text-neo-cyan focus:ring-neo-cyan rounded"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </WizardStep>
  );
}
