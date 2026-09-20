/**
 * The node you are STANDING ON is not "out of reach". Screen readers were told
 * it was, because the label fell through to the default for anything that is
 * neither tappable nor cleared.
 */
import { describe, it, expect } from 'vitest';
import { nodeLabelSuffix } from '../MapNodeButton';

describe('nodeLabelSuffix', () => {
  it('given the node under the player, when the label is built, then it says you are here', () => {
    expect(nodeLabelSuffix('current', false)).toBe('youAreHere');
    expect(nodeLabelSuffix('current', true)).toBe('youAreHere');
  });

  it('given a walked node, when the label is built, then it says cleared', () => {
    expect(nodeLabelSuffix('done', false)).toBe('cleared');
  });

  it('given a legal next move, when the label is built, then the kind alone is the label', () => {
    expect(nodeLabelSuffix('next', true)).toBeNull();
  });

  it('given a node off the path, when the label is built, then it says out of reach', () => {
    expect(nodeLabelSuffix('far', false)).toBe('outOfReach');
  });
});
