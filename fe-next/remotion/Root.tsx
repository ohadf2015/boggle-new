import { Composition } from 'remotion';
import { TestComposition } from './compositions/TestComposition';

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
    </>
  );
};
