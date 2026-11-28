'use client';

import { useState } from 'react';
import { Tv } from 'lucide-react';

export default function PartyCodeJoin({ label, cta, onJoin }: { label: string; cta: string; onJoin: (code: string) => void }) {
  const [code, setCode] = useState('');
  const clean = code.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4);
  return (
    <form
      data-testid="party-code-join"
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length === 4) onJoin(clean);
      }}
      className="flex flex-wrap items-center gap-2 rounded-2xl border-[3px] border-black bg-neo-navy-light p-3 shadow-hard"
    >
      <label htmlFor="party-code" className="flex min-w-0 flex-1 items-center gap-2 font-neo-display text-sm font-black text-neo-white">
        <Tv className="size-5 shrink-0 text-neo-cyan" aria-hidden="true" />
        {label}
      </label>
      <input
        id="party-code"
        dir="ltr"
        value={clean}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
        className="h-11 w-28 rounded-xl border-[3px] border-black bg-neo-cream px-2 text-center font-neo-display text-xl font-black uppercase tracking-[0.2em] text-neo-navy outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
      />
      <button type="submit" disabled={clean.length !== 4} className="h-11 rounded-xl border-[3px] border-black bg-neo-cyan px-4 font-neo-display font-black text-neo-navy shadow-hard-sm disabled:opacity-50">
        {cta}
      </button>
    </form>
  );
}
