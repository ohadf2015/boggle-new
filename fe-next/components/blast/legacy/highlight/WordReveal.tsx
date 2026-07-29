import { m, AnimatePresence } from 'framer-motion';

export function WordReveal({ word, visible }: { word: string; visible: boolean }) {
  const letters = Array.from(word);
  return (
    <AnimatePresence>
      {visible && (
        <m.div
          data-testid="word-reveal"
          dir="auto"
          className="absolute top-[20%] left-1/2 -translate-x-1/2 z-[70] pointer-events-none flex gap-1"
          style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: '80px' }}
        >
          {letters.map((ch, i) => (
            <m.span
              key={`${ch}-${i}`}
              data-testid="word-reveal-letter"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.04, duration: 0.18 }}
              style={{
                color: '#FAFF00',
                textShadow: '4px 4px 0 #1a1a2e',
                textTransform: 'uppercase',
              }}
            >
              {ch}
            </m.span>
          ))}
        </m.div>
      )}
    </AnimatePresence>
  );
}
