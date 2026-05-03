'use client';
import { useState, useMemo } from 'react';
import type { ClueFragment, Room, RoomBeat } from '@/lib/word-vault/beats/types';
import type { SubmitResult } from '@/lib/word-vault/grid/types';
import { VaultGrid } from './grid/VaultGrid';
import { Notebook } from './Notebook';

type Props = {
  room: Room;
  onRoomComplete: () => void;
  onResult?: (r: SubmitResult) => void;
};

export function BeatRunner({ room, onRoomComplete, onResult }: Props) {
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [fragments, setFragments] = useState<ClueFragment[]>([]);
  const [vaultOpen, setVaultOpen] = useState(false);

  const currentBeat: RoomBeat | undefined = useMemo(() => {
    if (room.beatOrder === 'free') return room.beats.find((b) => !solved.has(b.id));
    // sequential / graph (graph not used in r1.1)
    return room.beats.find((b) => !solved.has(b.id));
  }, [room, solved]);

  if (!currentBeat) return null;

  const handleClueTap = (sceneObjectId: string) => {
    const obj = currentBeat.hint.objects.find((o) => o.sceneObjectId === sceneObjectId);
    if (!obj) return;
    setFragments((arr) =>
      arr.some((f) => f.id === obj.fragmentId)
        ? arr
        : [...arr, { ...obj.onTap, id: obj.fragmentId, roomId: room.id }],
    );
  };

  const handleResult = (r: SubmitResult) => {
    onResult?.(r);
    if (r.kind !== 'target-hit') return;
    const next = new Set(solved);
    next.add(currentBeat.id);
    setSolved(next);
    setVaultOpen(false);
    if (next.size === room.beats.length) onRoomComplete();
  };

  return (
    <div dir="rtl" className="space-y-4 p-4">
      <p className="text-stone-300 italic">{currentBeat.hint.ambient}</p>
      <div className="flex gap-2 flex-wrap">
        {currentBeat.hint.objects.map((obj) => (
          <button
            key={obj.sceneObjectId}
            type="button"
            aria-label={`clue-tap-${obj.sceneObjectId}`}
            onClick={() => handleClueTap(obj.sceneObjectId)}
            className="rounded-md border-2 border-stone-600 bg-stone-800 px-3 py-2 text-stone-100 hover:bg-stone-700"
          >
            {obj.sceneObjectId}
          </button>
        ))}
      </div>
      <Notebook fragments={fragments} />
      {!vaultOpen && (
        <button
          type="button"
          aria-label="summon-vault"
          onClick={() => setVaultOpen(true)}
          className="rounded-md bg-yellow-500 text-stone-900 font-bold px-4 py-2"
        >
          פתח את הכספת
        </button>
      )}
      {vaultOpen && (
        <VaultGrid config={currentBeat.grid} onResult={handleResult} />
      )}
    </div>
  );
}
