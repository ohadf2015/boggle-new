'use client';

import type { ComponentProps } from 'react';
import ResultsPage from '@/components/views/ResultsPage';
import { MpScreen } from '../shell/MpScreen';

export type MpResultsScreenProps = ComponentProps<typeof ResultsPage>;

/**
 * RESULTS stub (FOUNDATION): the one results screen for both the between-rounds
 * intermission and the final results — the RESULTS piece branches inside on
 * `seriesRoundNumber < seriesTotalGames`, so the router needs no discriminator.
 * Today it renders ResultsPage in the no-scroll frame; the body scrolls inside
 * (ResultsPage is still a long page until RESULTS moves details into a sheet).
 */
export default function MpResultsScreen(props: MpResultsScreenProps) {
  return <MpScreen testId="mp-results" bodyScroll="inner" body={<ResultsPage {...props} />} />;
}
