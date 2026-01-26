/**
 * Dynamic imports for large components
 * This file centralizes all dynamic imports to reduce initial bundle size
 * and improve Time to Interactive (TTI)
 */

import dynamic from 'next/dynamic';

/**
 * Non-critical components that can be loaded on-demand
 */

// Email capture modal - shown conditionally, not needed immediately
export const EmailCaptureModal = dynamic(() => import('@/components/EmailCaptureModal'), {
  loading: () => null,
  ssr: false,
});

// PWA install prompt - shown only when PWA is installable
export const PWAInstallPrompt = dynamic(() => import('@/components/PWAInstallPrompt'), {
  loading: () => null,
  ssr: false,
});

// New Year countdown - seasonal component
export const NewYearCountdown = dynamic(() => import('@/components/celebration/NewYearCountdown'), {
  loading: () => null,
  ssr: false,
});

// Three.js components - heavy 3D graphics library
// Note: Commented out until Scene component is implemented
// export const ThreeJSScene = dynamic(() => import('@/components/three/Scene'), {
//   loading: () => (
//     <div className="flex items-center justify-center w-full h-full">
//       <div className="w-16 h-16 border-4 border-neo-lime border-t-transparent rounded-full animate-spin" />
//     </div>
//   ),
//   ssr: false,
// });

// Chart components - heavy recharts library
// Note: Commented out until Chart component is implemented
// export const DynamicChart = dynamic(() => import('@/components/charts/Chart'), {
//   loading: () => (
//     <div className="flex items-center justify-center w-full h-48">
//       <div className="w-12 h-12 border-4 border-neo-lime border-t-transparent rounded-full animate-spin" />
//     </div>
//   ),
//   ssr: false,
// });

// QR Code component - only needed when sharing room codes
export const DynamicQRCode = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), {
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <div className="w-12 h-12 border-4 border-neo-lime border-t-transparent rounded-full animate-spin" />
    </div>
  ),
  ssr: false,
});

// Confetti animation - only needed for celebrations
// Note: Commented out until ConfettiCannon component is implemented
// export const ConfettiCannon = dynamic(() => import('@/components/ConfettiCannon'), {
//   loading: () => null,
//   ssr: false,
// });

// Admin components - only loaded for admin users
// Note: Commented out until AdminPanel component is implemented
// export const AdminPanel = dynamic(() => import('@/components/admin/AdminPanel'), {
//   loading: () => (
//     <div className="flex items-center justify-center w-full h-screen">
//       <div className="w-16 h-16 border-4 border-neo-lime border-t-transparent rounded-full animate-spin" />
//     </div>
//   ),
//   ssr: false,
// });

// Settings modal - only loaded when user opens settings
// Note: Commented out until SettingsModal component is implemented
// export const SettingsModal = dynamic(() => import('@/components/SettingsModal'), {
//   loading: () => null,
//   ssr: false,
// });

// Leaderboard - large data table, not needed on initial load
// Note: Commented out until Leaderboard component is implemented
// export const Leaderboard = dynamic(() => import('@/components/Leaderboard'), {
//   loading: () => (
//     <div className="flex items-center justify-center w-full h-96">
//       <div className="w-16 h-16 border-4 border-neo-lime border-t-transparent rounded-full animate-spin" />
//     </div>
//   ),
//   ssr: true, // Keep SSR for SEO
// });

// Achievement gallery - heavy image gallery
// Note: Commented out until AchievementGallery component is implemented
// export const AchievementGallery = dynamic(() => import('@/components/achievements/Gallery'), {
//   loading: () => (
//     <div className="flex items-center justify-center w-full h-96">
//       <div className="w-16 h-16 border-4 border-neo-lime border-t-transparent rounded-full animate-spin" />
//     </div>
//   ),
//   ssr: false,
// });

/**
 * Code splitting strategy:
 *
 * 1. **Critical Path** (Load immediately):
 *    - Landing page
 *    - Game board
 *    - Basic UI components
 *    - Authentication
 *
 * 2. **Above-the-fold** (Lazy load after initial render):
 *    - Footer
 *    - Navigation
 *    - Simple modals
 *
 * 3. **Below-the-fold** (Load on scroll/interaction):
 *    - Email capture
 *    - PWA install prompt
 *    - Settings
 *    - Admin panel
 *
 * 4. **On-demand** (Load only when needed):
 *    - QR codes
 *    - Charts
 *    - 3D graphics
 *    - Confetti effects
 *    - Achievement gallery
 *    - Leaderboard
 */

/**
 * Bundle size optimization tips:
 *
 * 1. Use tree-shaking friendly imports:
 *    ✅ import { specific } from 'library'
 *    ❌ import * as all from 'library'
 *
 * 2. Lazy load heavy libraries:
 *    - Three.js (3D graphics)
 *    - Recharts (charts)
 *    - QRCode (QR generation)
 *    - Canvas Confetti
 *
 * 3. Use next/dynamic for route-level code splitting:
 *    - Each page should be its own chunk
 *    - Modal components should be dynamically imported
 *
 * 4. Optimize images:
 *    - Use Next.js Image component
 *    - Convert GIFs to video
 *    - Use WebP format
 *
 * 5. Remove unused dependencies:
 *    - Run: npx depcheck
 *    - Remove unused packages from package.json
 */
