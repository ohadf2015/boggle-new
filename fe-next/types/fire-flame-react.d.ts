declare module '@9am/fire-flame-react' {
  import { ComponentType } from 'react';

  interface FireFlameOption {
    painter?: 'canvas' | 'svg';
    w?: number;
    h?: number;
    x?: number;
    y?: number;
    mousemove?: boolean;
    fps?: number;
    wind?: { x: number; y: number };
  }

  interface FireFlameProps {
    option?: FireFlameOption;
  }

  export const FireFlame: ComponentType<FireFlameProps>;
}
