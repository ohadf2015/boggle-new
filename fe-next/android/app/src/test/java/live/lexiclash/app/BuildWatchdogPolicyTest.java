package live.lexiclash.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * BuildWatchdogPolicy — the staleness decision must be conservative: a wrong
 * "stale" verdict destroys the offline cold-start cache; a wrong "fresh"
 * verdict just delays a deploy by one app restart.
 */
public class BuildWatchdogPolicyTest {

    @Test
    public void sameBuildIsFresh() {
        assertFalse(BuildWatchdogPolicy.isStale("2026-09-07T17:38:00.000Z", "2026-09-07T17:38:00.000Z"));
    }

    @Test
    public void differentBuildIsStale() {
        // The regression this watchdog exists for: server shipped a new build
        // (leaderboard fix) while the WebView cache still holds the old one.
        assertTrue(BuildWatchdogPolicy.isStale("2026-09-05T19:51:00.000Z", "2026-09-07T17:38:00.000Z"));
    }

    @Test
    public void failedProbeNeverClears() {
        assertFalse(BuildWatchdogPolicy.isStale("2026-09-05T19:51:00.000Z", null));
        assertFalse(BuildWatchdogPolicy.isStale("2026-09-05T19:51:00.000Z", ""));
    }

    @Test
    public void noBaselineNeverClears() {
        // First run after install / feature lands: store the baseline, keep
        // whatever cache exists — on a first run it can only be current.
        assertFalse(BuildWatchdogPolicy.isStale(null, "2026-09-07T17:38:00.000Z"));
        assertFalse(BuildWatchdogPolicy.isStale("", "2026-09-07T17:38:00.000Z"));
    }
}
