/**
 * Scroll prevention for CrazyGames embed — prevents page-level scrolling
 * while allowing scrolling within scrollable containers.
 * Extracted from CrazyGamesSDK.tsx.
 */
import { useEffect } from 'react';
import { isTypingTarget } from '@/lib/dom/isTypingTarget';

export function useCrazyGamesScrollPrevention(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    // Allow scroll inside containers with `overflow: auto/scroll` AND allow
    // native document scroll when the page genuinely overflows the viewport.
    // Only block scroll when nothing on-page can actually scroll — prevents
    // rubber-band / parent-frame leakage without breaking legit page scroll
    // (settings, landing) inside the CG iframe.
    const documentOverflows = () =>
      document.documentElement.scrollHeight > window.innerHeight + 1;

    const preventScroll = (event: WheelEvent) => {
      let target = event.target as HTMLElement | null;

      while (target && target !== document.body) {
        const style = window.getComputedStyle(target);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;

        const isScrollableY = (overflowY === 'auto' || overflowY === 'scroll') && target.scrollHeight > target.clientHeight;
        const isScrollableX = (overflowX === 'auto' || overflowX === 'scroll') && target.scrollWidth > target.clientWidth;

        if (isScrollableY || isScrollableX) {
          if (event.deltaY !== 0 && isScrollableY) {
            const canScrollUp = target.scrollTop > 0;
            const canScrollDown = target.scrollTop < target.scrollHeight - target.clientHeight;

            if ((event.deltaY < 0 && canScrollUp) || (event.deltaY > 0 && canScrollDown)) {
              return;
            }
          }

          if (event.deltaX !== 0 && isScrollableX) {
            const canScrollLeft = target.scrollLeft > 0;
            const canScrollRight = target.scrollLeft < target.scrollWidth - target.clientWidth;

            if ((event.deltaX < 0 && canScrollLeft) || (event.deltaX > 0 && canScrollRight)) {
              return;
            }
          }
        }

        target = target.parentElement;
      }

      if (documentOverflows()) return;
      event.preventDefault();
    };

    const preventKeyScroll = (event: KeyboardEvent) => {
      // Allow normal keyboard behavior in form controls (typing spaces, arrow navigation)
      const active = document.activeElement;
      if (isTypingTarget(event)) {
        return;
      }

      const target = (event.target as HTMLElement) || (active as HTMLElement);

      if (target) {
        let element: HTMLElement | null = target;

        while (element && element !== document.body) {
          const style = window.getComputedStyle(element);
          const overflowY = style.overflowY;

          if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
            return;
          }

          element = element.parentElement;
        }
      }

      if (['ArrowUp', 'ArrowDown', ' ', 'PageUp', 'PageDown'].includes(event.key)) {
        if (documentOverflows()) return;
        event.preventDefault();
      }
    };

    const isScrollableElement = (element: HTMLElement | null): boolean => {
      while (element && element !== document.body) {
        const style = window.getComputedStyle(element);
        const overflowY = style.overflowY;

        if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
          return true;
        }

        element = element.parentElement;
      }
      return false;
    };

    let touchStartY = 0;
    let touchStartElement: HTMLElement | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        touchStartY = event.touches[0].clientY;
        touchStartElement = event.target as HTMLElement;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !touchStartElement) return;

      if (isScrollableElement(touchStartElement)) {
        let element: HTMLElement | null = touchStartElement;
        while (element && element !== document.body) {
          const style = window.getComputedStyle(element);
          const overflowY = style.overflowY;

          if ((overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight) {
            const touchY = event.touches[0].clientY;
            const deltaY = touchStartY - touchY;

            const canScrollUp = element.scrollTop > 0;
            const canScrollDown = element.scrollTop < element.scrollHeight - element.clientHeight;

            if ((deltaY > 0 && canScrollDown) || (deltaY < 0 && canScrollUp)) {
              return;
            }
            break;
          }

          element = element.parentElement;
        }
      }

      if (documentOverflows()) return;
      event.preventDefault();
    };

    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('keydown', preventKeyScroll);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('keydown', preventKeyScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [enabled]);
}
