import { m, AnimatePresence } from 'framer-motion';

export function LetterboxBars({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <>
          <m.div
            role="presentation"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 h-[12vh] bg-black z-[60] pointer-events-none"
          />
          <m.div
            role="presentation"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 h-[12vh] bg-black z-[60] pointer-events-none"
          />
        </>
      )}
    </AnimatePresence>
  );
}
