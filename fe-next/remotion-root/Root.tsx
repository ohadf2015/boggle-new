/**
 * Remotion Root - registers all compositions for rendering.
 */

import React from 'react';
import { Composition } from 'remotion';
import { WordHuntPromoVideo } from '../components/promo/WordHuntPromoVideo';
import { WordHuntPromoVideoHe } from '../components/promo/WordHuntPromoVideoHe';
import { WordleToLexiClashPromo } from '../components/promo/WordleToLexiClashPromo';
import { SurvivalPromoVideo } from '../components/promo/SurvivalPromoVideo';

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
      <Composition
        id="WordHuntPromoHe"
        component={WordHuntPromoVideoHe}
        durationInFrames={462}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SurvivalPromo"
        component={SurvivalPromoVideo}
        durationInFrames={565}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="WordleToLexiClash"
        component={WordleToLexiClashPromo}
        durationInFrames={550}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
