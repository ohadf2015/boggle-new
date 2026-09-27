/**
 * Face window for small avatars, in AvatarArt viewBox units (0-100). Shared by
 * the SVG compositor (viewBox) and AvatarLite (CSS zoom on the server PNG), so
 * both paths frame the same face. Dependency-free: AvatarLite must stay off
 * the art bundle.
 */
export const FACE_CROP = { x: 13, y: 4, size: 74 } as const;

/** At or below this pixel size an avatar is face-cropped. */
export const FACE_CROP_MAX_PX = 64;

/** CSS that zooms a full-token image (viewBox 0-100) onto FACE_CROP. */
export function faceCropImageStyle(): { transform: string; transformOrigin: string } {
  const scale = 100 / FACE_CROP.size;
  // Scaling about origin o keeps o fixed: solve o + (0 - o) / scale = crop start per axis.
  const origin = (start: number) => (start * scale) / (scale - 1);
  return {
    transform: `scale(${scale.toFixed(4)})`,
    transformOrigin: `${origin(FACE_CROP.x).toFixed(2)}% ${origin(FACE_CROP.y).toFixed(2)}%`,
  };
}
