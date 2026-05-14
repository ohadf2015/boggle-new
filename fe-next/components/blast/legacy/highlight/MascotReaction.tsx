import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export function MascotReaction({ epicness, visible }: { epicness: number; visible: boolean }) {
  const mood = epicness > 500 ? 'mindblown' : 'cool';
  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="absolute bottom-[18vh] right-6 z-[70] pointer-events-none"
        >
          <Image
            src={`/mascot/${mood}.gif`}
            alt=""
            width={140}
            height={140}
            unoptimized
            priority
          />
        </m.div>
      )}
    </AnimatePresence>
  );
}
