/**
 * $rageclick events arrive with a null target, so the Word Tower cluster could
 * not be traced to an element. We record the last click's element descriptor
 * and stamp it on $rageclick events in before_send.
 */

import {
  describeClickTarget,
  enrichRageclick,
  installRageclickTargetTracker,
} from '../posthogRageclickTarget';

describe('posthogRageclickTarget', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('describes tag, id, data-testid, classes and ancestor ignore-rage flag', () => {
    document.body.innerHTML =
      '<div data-feedback-ignore-rage=""><button id="b" data-testid="del" class="a b">x</button></div>';
    const d = describeClickTarget(document.getElementById('b'));
    expect(d).toMatchObject({ tag: 'button', id: 'b', testid: 'del', cls: 'a b', ignored: true });
  });

  it('stamps the last clicked element on $rageclick events only', () => {
    document.body.innerHTML = '<canvas id="c"></canvas>';
    const uninstall = installRageclickTargetTracker();
    document.getElementById('c')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const rage = enrichRageclick({ event: '$rageclick', properties: {} });
    expect(rage?.properties?.rage_target_tag).toBe('canvas');
    expect(rage?.properties?.rage_target_id).toBe('c');
    expect(rage?.properties?.rage_target_ignored).toBe(false);
    const other = { event: '$pageview', properties: {} };
    expect(enrichRageclick(other)).toBe(other);
    expect(other.properties).toEqual({});
    uninstall();
  });
});
