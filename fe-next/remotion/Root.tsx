import { Composition } from 'remotion';
import { TestComposition } from './compositions/TestComposition';
import { WorldTransition, WorldTransitionSchema } from './compositions/WorldTransition';
import {
  Tutorial,
  TutorialSchema,
  TUTORIAL_DURATION_FRAMES,
  TUTORIAL_FPS,
} from './compositions/Tutorial';
import { LevelIntro, LevelIntroSchema } from './compositions/LevelIntro';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TestComposition"
        component={TestComposition}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="WorldTransition"
        component={WorldTransition}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
        schema={WorldTransitionSchema}
        defaultProps={{
          fromWorldId: 'meadows',
          toWorldId: 'springs',
          locale: 'en',
        }}
      />
      <Composition
        id="Tutorial"
        component={Tutorial}
        durationInFrames={TUTORIAL_DURATION_FRAMES}
        fps={TUTORIAL_FPS}
        width={1920}
        height={1080}
        schema={TutorialSchema}
        defaultProps={{
          locale: 'en',
        }}
      />
      <Composition
        id="LevelIntro"
        component={LevelIntro}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
        schema={LevelIntroSchema}
        defaultProps={{
          worldId: 'meadows',
          locale: 'en',
        }}
      />
    </>
  );
};
