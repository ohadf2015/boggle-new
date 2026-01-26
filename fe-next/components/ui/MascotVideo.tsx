'use client';

import { motion } from 'framer-motion';
import { memo, useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { MascotVariant } from './Mascot';

/**
 * Size presets for the mascot video
 */
type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_CLASSES: Record<MascotSize, string> = {
  xs: 'w-10 h-10',
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-40 h-40',
  '2xl': 'w-48 h-48',
};

interface MascotVideoProps {
  /** Which mascot variant to display */
  variant: MascotVariant;
  /** Size of the mascot */
  size?: MascotSize;
  /** Whether to animate the mascot (CSS animations only, video always loops) */
  animated?: boolean;
  /** Custom class name for the container */
  className?: string;
  /** Priority loading for above-the-fold mascots */
  priority?: boolean;
  /** Alt text override */
  alt?: string;
  /** Fallback to GIF if video not available */
  useFallback?: boolean;
}

/**
 * Get video paths for a mascot variant
 * Returns WebM (modern browsers) and MP4 (Safari fallback)
 */
function getVideoSources(variant: MascotVariant): { webm: string; mp4: string; poster: string; gif: string } {
  const variantMap: Record<MascotVariant, string> = {
    happy: 'main-nobg',
    gaming: 'play-nobg',
    thinking: 'study-nobg',
    oops: 'oops-nobg',
    celebration: 'celebration-nobg',
    dj: 'dj-nobg',
    trophy: 'trophy-nobg',
  };

  const filename = variantMap[variant];

  return {
    webm: `/mascot/video/${filename}.webm`,
    mp4: `/mascot/video/${filename}.mp4`,
    poster: `/mascot/posters/${filename}.jpg`, // First frame as poster
    gif: `/mascot/${filename}.gif`, // Fallback GIF
  };
}

/**
 * Optimized Mascot component using video instead of GIF
 *
 * Benefits:
 * - 90% smaller file size (933KB GIF → ~90KB video)
 * - Faster LCP (Largest Contentful Paint)
 * - Better performance on mobile devices
 * - Native browser optimization
 *
 * @example
 * // Basic usage
 * <MascotVideo variant="happy" />
 *
 * // Priority loading for LCP optimization
 * <MascotVideo variant="happy" size="lg" priority />
 *
 * // With fallback to GIF for older browsers
 * <MascotVideo variant="gaming" useFallback />
 */
export const MascotVideo = memo(function MascotVideo({
  variant,
  size = 'md',
  animated = true,
  className = '',
  priority = false,
  alt,
  useFallback = true,
}: MascotVideoProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const shouldAnimate = animated && !prefersReducedMotion && enableComplexAnimations;
  const { webm, mp4, poster, gif } = getVideoSources(variant);
  const altText = alt || `Lexi mascot - ${variant}`;

  // Ensure video plays when loaded
  useEffect(() => {
    const video = videoRef.current;
    if (video && isVideoLoaded) {
      video.play().catch((error) => {
        // Autoplay might be blocked, that's okay
        console.debug('Video autoplay blocked:', error);
      });
    }
  }, [isVideoLoaded]);

  const handleVideoLoad = () => {
    setIsVideoLoaded(true);
  };

  const handleVideoError = () => {
    setHasError(true);
    console.warn(`Video failed to load for variant: ${variant}, falling back to GIF`);
  };

  // Fallback to GIF if video fails or useFallback is false
  if (hasError || !useFallback) {
    return (
      <motion.div
        className={`relative ${SIZE_CLASSES[size]} ${className}`}
        animate={shouldAnimate ? {
          y: [0, -8, 0],
          rotate: [0, -2, 2, 0],
          transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
        } : undefined}
      >
        <Image
          src={gif}
          alt={altText}
          fill
          className="object-contain drop-shadow-lg"
          priority={priority}
          unoptimized
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`relative ${SIZE_CLASSES[size]} ${className}`}
      animate={shouldAnimate ? {
        y: [0, -8, 0],
        rotate: [0, -2, 2, 0],
        transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
      } : undefined}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain drop-shadow-lg"
        autoPlay
        loop
        muted
        playsInline
        poster={poster}
        onLoadedData={handleVideoLoad}
        onError={handleVideoError}
        aria-label={altText}
      >
        {/* WebM for modern browsers (best compression) */}
        <source src={webm} type="video/webm" />
        {/* MP4 for Safari and older browsers */}
        <source src={mp4} type="video/mp4" />
        {/* Fallback text for browsers without video support */}
        Your browser does not support the video tag.
      </video>

      {/* Show loading state while video is loading */}
      {!isVideoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neo-navy/50 rounded-full">
          <div className="w-8 h-8 border-4 border-neo-lime border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </motion.div>
  );
});

/**
 * Mascot Video with entrance animation
 */
export const MascotVideoWithEntrance = memo(function MascotVideoWithEntrance({
  delay = 0,
  ...props
}: MascotVideoProps & { delay?: number }) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const shouldAnimate = !prefersReducedMotion && enableComplexAnimations;

  return (
    <motion.div
      initial={shouldAnimate ? { scale: 0, opacity: 0, y: 20 } : undefined}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay,
      }}
    >
      <MascotVideo {...props} />
    </motion.div>
  );
});

export default MascotVideo;
