import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

// Guard: registerRoot only exists in Remotion Studio/CLI, not in Jest
if (typeof registerRoot === 'function') {
  registerRoot(RemotionRoot);
}
