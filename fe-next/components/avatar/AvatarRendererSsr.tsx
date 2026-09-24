import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import AvatarArt from './art/AvatarArt';

// Server entry for the Express PNG route (react-dom/server renderToStaticMarkup).
// It is the SAME compositor the browser renders (art/AvatarArt) — only the
// idle animation is off (a PNG is one frame) and the id is static, which is
// safe because every PNG render is its own SVG document.

interface AvatarRendererSsrProps {
  config: CustomAvatarConfig;
  size?: number;
  circular?: boolean;
}

export default function AvatarRendererSsr({ config, size = 256, circular = true }: AvatarRendererSsrProps) {
  return <AvatarArt config={config} uid="ssr" size={size} circular={circular} animated={false} testId="custom-avatar-ssr" />;
}
