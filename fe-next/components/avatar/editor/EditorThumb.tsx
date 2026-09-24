'use client';

/**
 * Grid-cell thumbnail. The ONLY place the editor decides how a part is drawn
 * in a cell: the catalog's cheap `PartThumb` (one small SVG with just that
 * part on the player's own face, cropped) — never a full avatar per cell.
 * Rarity is shown by the cell frame, not inside the thumbnail.
 */
import { memo } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { PartThumb, type PartCategoryId } from '@/lib/avatar/catalog';

interface EditorThumbProps {
  category: PartCategoryId;
  id: string;
  config: CustomAvatarConfig;
  size: number;
}

function EditorThumb({ category, id, config, size }: EditorThumbProps) {
  return (
    <span data-testid="part-thumb" aria-hidden="true" className="absolute inset-[3%] flex items-center justify-center pointer-events-none">
      <PartThumb category={category} id={id} config={config} size={size} className="w-full h-full" />
    </span>
  );
}

export default memo(EditorThumb);
