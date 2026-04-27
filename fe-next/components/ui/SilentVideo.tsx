'use client';

import { forwardRef, useCallback, type VideoHTMLAttributes } from 'react';

type SilentVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, 'controls' | 'muted'>;

export const SilentVideo = forwardRef<HTMLVideoElement, SilentVideoProps>(
  function SilentVideo(props, forwardedRef) {
    const handleRef = useCallback(
      (el: HTMLVideoElement | null) => {
        if (el) {
          el.muted = true;
          el.defaultMuted = true;
          const playPromise = el.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        }
        if (typeof forwardedRef === 'function') forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      },
      [forwardedRef]
    );

    return (
      <video
        {...props}
        ref={handleRef}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
        disablePictureInPicture
        disableRemotePlayback
      />
    );
  }
);

export default SilentVideo;
