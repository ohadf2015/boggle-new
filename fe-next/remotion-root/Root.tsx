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
import { RedditGameplayDemo } from '../components/promo/RedditGameplayDemo';
import { RedditMultilingualShowcase } from '../components/promo/RedditMultilingualShowcase';
import { RedditVSBattle } from '../components/promo/RedditVSBattle';
import { BlastPromoVideo } from '../components/promo/BlastPromoVideo';

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

      {/* Blast Mode Instagram Promo */}
      <Composition
        id="BlastPromo"
        component={BlastPromoVideo}
        durationInFrames={407}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* Reddit Landscape Promos (1920x1080) */}
      <Composition
        id="RedditGameplayDemo"
        component={RedditGameplayDemo}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="RedditMultilingualShowcase"
        component={RedditMultilingualShowcase}
        durationInFrames={500}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="RedditVSBattle"
        component={RedditVSBattle}
        durationInFrames={350}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
