/**
 * Test: CreateChallengeModal Portal Rendering
 *
 * This test verifies that the modal now uses Radix Dialog with portal,
 * ensuring it renders at document root instead of inline.
 */

import fs from 'fs';
import path from 'path';

describe('CreateChallengeModal - Portal Rendering', () => {
  const modalPath = path.join(__dirname, '../CreateChallengeModal.tsx');
  const modalCode = fs.readFileSync(modalPath, 'utf-8');

  it('should import Dialog, DialogContent, and DialogTitle from ui/dialog', () => {
    expect(modalCode).toContain("import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'");
  });

  it('should NOT import AnimatePresence (removed)', () => {
    expect(modalCode).not.toContain('AnimatePresence');
  });

  it('should use Dialog wrapper instead of AnimatePresence', () => {
    expect(modalCode).toContain('<Dialog open={isOpen}');
    expect(modalCode).toContain('onOpenChange');
  });

  it('should use DialogContent with proper configuration', () => {
    expect(modalCode).toContain('<DialogContent');
    expect(modalCode).toContain('noDescription');
    expect(modalCode).toContain('hideCloseButton');
  });

  it('should NOT have manual backdrop div (handled by Dialog)', () => {
    expect(modalCode).not.toContain('z-[100]');
    expect(modalCode).not.toContain('backdrop-blur-sm');
  });

  it('should NOT have manual positioning classes (handled by DialogPortal)', () => {
    const hasManualPositioning = modalCode.includes('fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2');
    expect(hasManualPositioning).toBe(false);
  });

  it('should have proper max-width constraint', () => {
    expect(modalCode).toContain('max-w-lg');
  });

  it('should maintain custom animations for internal content', () => {
    // Loading state should still have animations
    expect(modalCode).toContain('animate={{ rotate: 360 }}');
    // Success confetti should still animate
    expect(modalCode).toContain('Sparkles');
  });

  it('should have all button text colors explicitly defined', () => {
    // Generate button
    expect(modalCode).toContain('text-neo-white');
    // Board size buttons
    expect(modalCode).toContain('text-neo-black');
    expect(modalCode).toContain('text-neo-cyan');
    expect(modalCode).toContain('text-neo-orange');
  });

  it('should close Dialog structure correctly', () => {
    expect(modalCode).toContain('</DialogContent>');
    expect(modalCode).toContain('</Dialog>');
  });
});
