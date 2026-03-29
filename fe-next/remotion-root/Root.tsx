/**
 * Remotion Root - registers all compositions for rendering.
 */

import React from 'react';
import { Composition } from 'remotion';
import { WordHuntPromoVideo } from '../components/promo/WordHuntPromoVideo';
import { WordHuntPromoVideoHe } from '../components/promo/WordHuntPromoVideoHe';
import { WordleToLexiClashPromo } from '../components/promo/WordleToLexiClashPromo';
import { SurvivalPromoVideo } from '../components/promo/SurvivalPromoVideo';
import { WordleToLexiClashPromoHe } from '../components/promo/WordleToLexiClashPromoHe';
import { SurvivalPromoVideoHe } from '../components/promo/SurvivalPromoVideoHe';

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
      <Composition
        id="WordleToLexiClashHe"
        component={WordleToLexiClashPromoHe}
        durationInFrames={550}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SurvivalPromoHe"
        component={SurvivalPromoVideoHe}
        durationInFrames={565}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
