import { useLanguage } from '@/contexts/LanguageContext';
import { History } from 'lucide-react';

interface TeacherLastGameShortcutProps {
  classroomCount: number;
  onOpen: () => void;
  className?: string;
}

export function TeacherLastGameShortcut({
  classroomCount,
  onOpen,
  className,
}: TeacherLastGameShortcutProps) {
  const { t } = useLanguage();

  if (classroomCount === 0) {
    return null;
  }

  return (
    <button
      type="button"
      data-testid="shortcut-last-game"
      onClick={onOpen}
      className={className}
    >
      <History className="size-4 shrink-0 text-neo-cyan" aria-hidden="true" />
      {t('teacher.playNow.shortcutLastGame')}
    </button>
  );
}
