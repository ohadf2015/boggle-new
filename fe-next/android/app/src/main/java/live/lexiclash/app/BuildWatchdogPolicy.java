package live.lexiclash.app;

/**
 * Pure staleness rule for the build watchdog.
 *
 * Deliberately free of Android imports so it can be unit-tested on a plain
 * JVM (android.app/src/test) and reasoned about without the framework.
 */
public final class BuildWatchdogPolicy {

    private BuildWatchdogPolicy() {}

    /**
     * The WebView's cached web build is stale only when BOTH sides are known
     * and they differ:
     *
     * - null/empty {@code fetchedBuild} → probe failed or blank response:
     *   fail OPEN. Never clear the cache on a guess — clearing also destroys
     *   the offline cold-start cache, which is the one thing that lets the
     *   app boot with no network.
     * - null/empty {@code lastSeenBuild} → no baseline stored yet (fresh
     *   install / first run after this feature lands): the baseline is stored
     *   by the caller, but we do NOT clear. On a true first run the cache is
     *   empty or already current, so clearing buys nothing and costs the
     *   offline cache if we were wrong.
     */
    public static boolean isStale(String lastSeenBuild, String fetchedBuild) {
        if (fetchedBuild == null || fetchedBuild.isEmpty()) return false;
        if (lastSeenBuild == null || lastSeenBuild.isEmpty()) return false;
        return !fetchedBuild.equals(lastSeenBuild);
    }
}
