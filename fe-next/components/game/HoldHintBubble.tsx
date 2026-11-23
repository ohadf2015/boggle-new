/** "Hold to clear" bubble over a backspace key; the key must be `relative`. */
export function HoldHintBubble({ label }: { label: string }) {
  return (
    <span
      role="status"
      className="pointer-events-none absolute -top-9 end-0 z-10 whitespace-nowrap rounded-neo border-2 border-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black text-neo-navy shadow-hard-sm"
    >
      {label}
    </span>
  );
}
