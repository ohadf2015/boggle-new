'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, UserMinus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { fetchWithAuth } from '@/utils/authFetch';
import { cn } from '@/lib/utils';

interface RosterRemoveButtonProps {
  classroomId: string;
  studentId: string;
  name: string;
  onRemoved: (studentId: string) => void;
}

export function RosterRemoveButton({ classroomId, studentId, name, onRemoved }: RosterRemoveButtonProps) {
  const { t } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  const remove = async () => {
    setConfirming(false);
    setRemoving(true);
    try {
      const res = await fetchWithAuth(`/api/education/classroom/${classroomId}/members/${studentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onRemoved(studentId);
    } catch {
      toast.error(t('eduLiveRoom.lobby.removeFailed'));
    } finally {
      setRemoving(false);
    }
  };

  const label = t('eduLiveRoom.lobby.removeStudent', { name });
  return (
    <>
      <button
        type="button"
        data-testid="roster-remove"
        aria-label={label}
        title={label}
        disabled={removing}
        aria-busy={removing}
        onClick={() => setConfirming(true)}
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-neo border-2 border-black bg-neo-white text-neo-black shadow-hard-sm',
          'transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-60 motion-reduce:transition-none',
          'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
        )}
      >
        {removing ? (
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <UserMinus className="size-4" strokeWidth={2.5} aria-hidden="true" />
        )}
      </button>
      <ConfirmationDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('eduLiveRoom.lobby.removeConfirmTitle', { name })}
        description={undefined}
        confirmText={t('eduLiveRoom.lobby.removeConfirm')}
        cancelText={t('common.cancel')}
        variant="danger"
        analyticsId="edu_roster_remove_student"
        onConfirm={() => void remove()}
      />
    </>
  );
}
