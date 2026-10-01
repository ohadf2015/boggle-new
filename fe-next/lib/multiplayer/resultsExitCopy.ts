/**
 * Exit copy on the results screen. A classroom host's exit closes the room for
 * the whole class and lands on the teacher hub, so it gets its own label and a
 * single statement of that — never the arcade "you'll miss the next round".
 */
export interface ResultsExitCopy {
  leaveKey: string;
  titleKey: string;
  bodyKey: string;
}

export function resultsExitCopy({ isClassroom, isHost }: { isClassroom: boolean; isHost: boolean }): ResultsExitCopy {
  if (isClassroom && isHost) {
    return { leaveKey: 'mpUi.results.backToClass', titleKey: 'mpUi.results.endClassTitle', bodyKey: 'mpUi.results.endClassBody' };
  }
  return { leaveKey: 'mpUi.results.leave', titleKey: 'playerView.exitConfirmation', bodyKey: 'results.exitWarning' };
}
