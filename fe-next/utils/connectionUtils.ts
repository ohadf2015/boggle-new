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

