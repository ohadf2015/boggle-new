import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installTranslationDomGuard } from '../domTranslationGuard';

describe('installTranslationDomGuard', () => {
  let originalRemoveChild: typeof Node.prototype.removeChild;
  let originalInsertBefore: typeof Node.prototype.insertBefore;

  beforeEach(() => {
    originalRemoveChild = Node.prototype.removeChild;
    originalInsertBefore = Node.prototype.insertBefore;
  });

  afterEach(() => {
    Node.prototype.removeChild = originalRemoveChild;
    Node.prototype.insertBefore = originalInsertBefore;
  });

  it('removeChild still works normally for genuine children', () => {
    installTranslationDomGuard();
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);

    expect(parent.removeChild(child)).toBe(child);
    expect(parent.contains(child)).toBe(false);
  });

  it('removeChild no-ops instead of throwing when the node was already detached (browser translate)', () => {
    installTranslationDomGuard();
    const parent = document.createElement('div');
    const orphan = document.createElement('span'); // never appended to parent

    // Without the guard this throws NotFoundError (the React+GoogleTranslate crash).
    expect(() => parent.removeChild(orphan)).not.toThrow();
    expect(parent.removeChild(orphan)).toBe(orphan);
  });

  it('insertBefore still works normally for genuine reference nodes', () => {
    installTranslationDomGuard();
    const parent = document.createElement('div');
    const ref = document.createElement('span');
    const inserted = document.createElement('b');
    parent.appendChild(ref);

    expect(parent.insertBefore(inserted, ref)).toBe(inserted);
    expect(parent.firstChild).toBe(inserted);
  });

  it('insertBefore falls back to append when the reference node was moved away', () => {
    installTranslationDomGuard();
    const parent = document.createElement('div');
    const inserted = document.createElement('b');
    const movedRef = document.createElement('span'); // not a child of parent

    expect(() => parent.insertBefore(inserted, movedRef)).not.toThrow();
    expect(parent.contains(inserted)).toBe(true);
  });

  it('is idempotent — installing twice does not double-wrap or break behavior', () => {
    installTranslationDomGuard();
    installTranslationDomGuard();
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    expect(parent.removeChild(child)).toBe(child);
  });
});
