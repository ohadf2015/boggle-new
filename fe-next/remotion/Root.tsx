/**
 * Remotion Root - registers all compositions for rendering.
 */

import React from 'react';
import { Composition } from 'remotion';
import { WordHuntPromoVideo } from '../components/promo/WordHuntPromoVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WordHuntPromo"
        component={WordHuntPromoVideo}
        durationInFrames={462}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
