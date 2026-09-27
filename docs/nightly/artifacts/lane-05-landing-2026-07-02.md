status: partial
attempted: Sealed Bid — Decaying Bid Multiplier (polish:try:sealed-bid:f8658a20) — speed bonus 3.0×→1.0× over 15s applied to unique bids
files_touched:
  - fe-next/lib/sealedBid/sp/sbEngine.ts  (engine: bidMultiplier param on resolveRound + commitBid; RoundResult gains bidMultiplier field)
  - fe-next/lib/sealedBid/sp/__tests__/sbEngine.test.ts  (4 new TDD tests: multiplier applied to unique, NOT to clash, default 1.0, commitBid threads through)
  - fe-next/translations/en.js  (sealedBid.speedLabel: "Speed bonus")
  - fe-next/translations/he.js  (sealedBid.speedLabel: "בונוס מהירות")
  - fe-next/translations/sv.js  (sealedBid.speedLabel: "Snabbbonus")
  - fe-next/translations/ja.js  (sealedBid.speedLabel: "スピードボーナス")
  - fe-next/translations/es.js  (sealedBid.speedLabel: "Bonus de velocidad")
blocked_file:
  - fe-next/app/[locale]/sealed-bid/page.tsx  (HIT 8/8 FILE CAP — not edited)
next_steps: |
  page.tsx needs 4 surgical edits to complete the feature:
  1. After `const revealFiredRef = useRef(false);` add:
       const bidMultiplierRef = useRef(3.0);
       const [displayMultiplier, setDisplayMultiplier] = useState(3.0);
       const rafRef = useRef<number | null>(null);
  2. After the `winFlash` useEffect (around line 178), add rAF decay useEffect:
       useEffect(() => {
         const DURATION = 15000;
         if (state.phase !== 'bidding') {
           bidMultiplierRef.current = 3.0;
           setDisplayMultiplier(3.0);
           if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
           return;
         }
         const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
         if (reduce) { bidMultiplierRef.current = 1.0; setDisplayMultiplier(1.0); return; }
         const start = performance.now();
         const tick = (now: number) => {
           const t = Math.min((now - start) / DURATION, 1);
           const mult = 3.0 - 2.0 * t;
           bidMultiplierRef.current = mult;
           const rounded = Math.round(mult * 10) / 10;
           setDisplayMultiplier((prev) => (prev !== rounded ? rounded : prev));
           if (t < 1) rafRef.current = requestAnimationFrame(tick);
           else rafRef.current = null;
         };
         rafRef.current = requestAnimationFrame(tick);
         return () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
       }, [state.phase]);
  3. In lockIn: change `commitBid(s, word, true)` → `commitBid(s, word, true, bidMultiplierRef.current)`
  4. In bidding phase JSX (around line 441, before the word-builder div), add:
       {displayMultiplier > 1.001 && (
         <div className={`flex flex-col items-center gap-0.5 ${displayMultiplier >= 2 ? 'text-neo-lime' : displayMultiplier >= 1.5 ? 'text-neo-yellow' : 'text-neo-orange'}`}>
           <span className="font-neo-display font-black text-5xl tabular-nums leading-none">
             {displayMultiplier.toFixed(1)}×
           </span>
           <span className="font-neo-body text-xs uppercase tracking-widest opacity-70">{t('sealedBid.speedLabel')}</span>
         </div>
       )}
  The engine half is COMPLETE and gate-clean; the UI half needs one more lane night.
