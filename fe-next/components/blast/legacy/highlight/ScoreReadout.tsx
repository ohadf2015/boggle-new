import { m, AnimatePresence } from 'framer-motion';

export function ScoreReadout({ score, visible }: { score: number; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ scale: 0, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: -4 }}
          exit={{ scale: 1.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-[70] pointer-events-none"
          style={{
            fontFamily: 'Fredoka, sans-serif',
            fontWeight: 700,
            fontSize: '96px',
            color: '#FAFF00',
            textShadow: '4px 4px 0 #1a1a2e',
            WebkitTextStroke: '2px #1a1a2e',
          }}
        >
          +{score}
        </m.div>
      )}
    </AnimatePresence>
  );
}
