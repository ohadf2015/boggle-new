/** The few navy/white pieces of the Blast stage, with the classroom (sky page) variant. */
export function blastStageSkin(classroom: boolean) {
  return classroom
    ? {
        cascadeBadge: 'px-5 py-2 rounded-neo bg-edu-surface border-3 border-neo-black shadow-edu-lip-sm',
        cascadeWord: 'text-edu-lime-ink font-neo-display text-xl font-black tracking-wide',
        wordLength: 'text-[10px] font-bold tabular-nums text-edu-ink',
      }
    : {
        cascadeBadge: 'px-5 py-2 rounded-neo bg-neo-navy border-3 border-neo-black shadow-hard',
        cascadeWord: 'text-neo-lime font-neo-display text-xl font-black tracking-wide',
        wordLength: 'text-[10px] font-bold tabular-nums text-white',
      };
}
