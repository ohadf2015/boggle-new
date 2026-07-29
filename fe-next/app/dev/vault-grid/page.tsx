'use client';
import { useState } from 'react';
import { VaultGrid } from '@/components/word-vault/grid/VaultGrid';
import type { SubmitResult, VaultGridConfig } from '@/lib/word-vault/grid/types';

const r1_1: VaultGridConfig = {
  size: 3,
  letterSource: 'pangram',
  traversal: 'anytap',
  targets: [{ word: 'אש' }],
  semanticGate: { class: 'name-male', acceptList: ['אש', 'אורי', 'אבי'], rareBonusList: ['להבה'] },
  bonusBucket: { baseCoinsPerWord: 2 },
};

const r1_4_thaw: VaultGridConfig = {
  size: 4,
  letterSource: 'pangram',
  traversal: 'adjacent',
  targets: [{ word: 'אש' }, { word: 'חום' }],
  modifiers: [{ kind: 'frozen', n: 6 }],
  semanticGate: { class: 'warmth', acceptList: ['אש', 'חום', 'דבש', 'שמש'] },
  bonusBucket: { baseCoinsPerWord: 2 },
};

export default function DevVaultGridPage() {
  const [log, setLog] = useState<SubmitResult[]>([]);
  if (process.env.NODE_ENV === 'production') return null;
  const handle = (r: SubmitResult) => setLog((l) => [r, ...l].slice(0, 20));

  return (
    <div dir="rtl" className="min-h-screen bg-stone-950 text-stone-100 p-6 max-w-md mx-auto space-y-8">
      <h1 className="text-2xl font-bold">VaultGrid dev smoke</h1>
      <section>
        <h2 className="text-lg mb-2">r1.1 (tutorial — anytap, no modifiers)</h2>
        <VaultGrid config={r1_1} onResult={handle} />
      </section>
      <section>
        <h2 className="text-lg mb-2">r1.4 thaw (adjacent + frozen(6))</h2>
        <VaultGrid config={r1_4_thaw} onResult={handle} />
      </section>
      <section>
        <h2 className="text-lg mb-2">log</h2>
        <pre className="text-xs bg-stone-900 p-2 rounded overflow-auto">
          {log.map((r) => JSON.stringify(r) + '\n').join('')}
        </pre>
      </section>
    </div>
  );
}
