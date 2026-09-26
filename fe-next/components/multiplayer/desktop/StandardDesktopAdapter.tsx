import { memo } from 'react';
import { ModeDesktopAdapter, type DesktopAdapterBaseProps, type ModeDesktopConfig } from './ModeDesktopAdapter';

export type StandardDesktopAdapterProps = DesktopAdapterBaseProps;

const CONFIG: ModeDesktopConfig = {
  mode: 'classic',
  testPrefix: 'standard',
  modeNameKey: 'mp.modeName.classic',
  timerColor: 'cyan',
  timerSize: 80,
  withTexture: true,
};

/** Classic mode desktop shell — config over the shared ModeDesktopAdapter. */
function StandardDesktopAdapterImpl(props: StandardDesktopAdapterProps) {
  return <ModeDesktopAdapter {...props} config={CONFIG} />;
}

export const StandardDesktopAdapter = memo(StandardDesktopAdapterImpl);
