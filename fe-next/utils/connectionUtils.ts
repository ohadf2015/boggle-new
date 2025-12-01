/**
 * Connection-aware loading utilities for slow connection optimization
 * Uses the Network Information API when available to detect connection quality
 */

// Network Information API types
interface NetworkInformation extends EventTarget {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

/**
 * Get the current network connection info if available
 */
export function getNetworkInfo(): NetworkInformation | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

/**
 * Check if the user is on a slow connection
 * Returns true for 2G, slow-2G, or when save-data is enabled
 */
export function isSlowConnection(): boolean {
  const connection = getNetworkInfo();
  if (!connection) return false; // Assume good connection if API not available

  // Check if user has explicitly requested reduced data
  if (connection.saveData) return true;

  // Check effective connection type
  const slowTypes = ['slow-2g', '2g'];
  if (slowTypes.includes(connection.effectiveType)) return true;

  // Check if download speed is below 1 Mbps
  if (connection.downlink < 1) return true;

  // Check if round-trip time is above 500ms
  if (connection.rtt > 500) return true;

  return false;
}

/**
 * Check if the user is on a medium-speed connection (3G)
 */
export function isMediumConnection(): boolean {
  const connection = getNetworkInfo();
  if (!connection) return false;

  return connection.effectiveType === '3g' || (connection.downlink >= 1 && connection.downlink < 5);
}

/**
 * Check if the user is on a fast connection (4G+)
 */
export function isFastConnection(): boolean {
  const connection = getNetworkInfo();
  if (!connection) return true; // Assume good connection if API not available

  return connection.effectiveType === '4g' && connection.downlink >= 5;
}

/**
 * Get a suggested loading strategy based on connection quality
 */
export type LoadingStrategy = 'minimal' | 'balanced' | 'full';

export function getLoadingStrategy(): LoadingStrategy {
  if (isSlowConnection()) return 'minimal';
  if (isMediumConnection()) return 'balanced';
  return 'full';
}

/**
 * Subscribe to connection changes
 */
export function onConnectionChange(callback: (strategy: LoadingStrategy) => void): () => void {
  const connection = getNetworkInfo();
  if (!connection) return () => {};

  const handler = () => callback(getLoadingStrategy());
  connection.addEventListener('change', handler);

  return () => connection.removeEventListener('change', handler);
}

/**
 * Defer loading of a resource based on connection quality
 * Returns a promise that resolves after an appropriate delay
 */
export function deferLoad(priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
  const strategy = getLoadingStrategy();

  const delays: Record<LoadingStrategy, Record<typeof priority, number>> = {
    minimal: { high: 2000, medium: 5000, low: 10000 },
    balanced: { high: 500, medium: 2000, low: 5000 },
    full: { high: 0, medium: 500, low: 1000 },
  };

  const delay = delays[strategy][priority];
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Create a connection-aware image preloader
 * Only preloads images on fast connections
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Skip preloading on slow connections
    if (isSlowConnection()) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Batch preload images with connection awareness
 * On slow connections, only preloads critical images
 */
export function preloadImages(
  images: Array<{ src: string; critical?: boolean }>
): Promise<void[]> {
  const strategy = getLoadingStrategy();

  const imagesToLoad = images.filter(img => {
    if (strategy === 'minimal') return img.critical === true;
    if (strategy === 'balanced') return img.critical !== false;
    return true;
  });

  return Promise.all(imagesToLoad.map(img => preloadImage(img.src)));
}
