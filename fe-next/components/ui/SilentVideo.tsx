'use client';

import { forwardRef, useCallback, type VideoHTMLAttributes, type ImgHTMLAttributes } from 'react';

type SilentVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, 'controls' | 'muted'>;

/**
 * Polymorphic video/image renderer. WebP src → <img> (animated WebP plays everywhere,
 * survives autoplay/codec quirks on Android/iOS WebViews). Anything else → muted autoplay <video>.
 */
export const SilentVideo = forwardRef<HTMLVideoElement, SilentVideoProps>(
  function SilentVideo(props, forwardedRef) {
    const isImage = typeof props.src === 'string' && /\.(webp|gif|png|jpe?g|avif)$/i.test(props.src);

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

    if (isImage) {
      const {
        src,
        width,
        height,
        className,
        style,
        // Strip video-only props
        autoPlay: _autoPlay,
        loop: _loop,
        playsInline: _playsInline,
        preload: _preload,
        poster: _poster,
        crossOrigin: _crossOrigin,
        ...rest
      } = props as SilentVideoProps & { autoPlay?: boolean; loop?: boolean };
      const imgProps = rest as unknown as ImgHTMLAttributes<HTMLImageElement>;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...imgProps}
          src={typeof src === 'string' ? src : undefined}
          width={width}
          height={height}
          className={className}
          style={style}
          alt={imgProps.alt ?? ''}
          decoding="async"
        />
      );
    }

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
