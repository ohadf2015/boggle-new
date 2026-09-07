package live.lexiclash.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.util.Log;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import org.json.JSONObject;

/**
 * BuildWatchdog — makes new web deploys actually reach the native app.
 *
 * Why this exists (device-verified 2026-09-07): MainActivity sets
 * {@code WebSettings.LOAD_CACHE_ELSE_NETWORK}, which serves cached resources
 * "even if they have expired". Chromium therefore never revalidates: once
 * the daily-hub HTML and its immutable JS chunks are in the HTTP cache the
 * WebView runs the OLD web build indefinitely — a leaderboard fix deployed
 * 18:38 IDT was still absent on a device hours later, no matter how many
 * times the app was reopened. JS cannot fix this: the Cache Storage API
 * (what VersionChecker can clear) is not Chromium's HTTP cache. Only native
 * {@code WebView.clearCache(true)} reaches it.
 *
 * How: on every cold start, BEFORE the initial navigation, probe
 * {@code /api/version} (served no-store) on a background thread with a ~1s
 * budget and fail open. When the server's {@code NEXT_PUBLIC_BUILD_TIME}
 * differs from the baseline stored after the last successful probe, the
 * caller clears the WebView cache so the pending navigation fetches the new
 * build. Offline → skip entirely: the offline launcher depends on the cache
 * being intact.
 */
public final class BuildWatchdog {

    private static final String TAG = "BuildWatchdog";
    private static final String PREFS = "lexiclash_watchdog";
    private static final String KEY_LAST_BUILD = "last_seen_build";
    private static final int PROBE_TIMEOUT_MS = 1000;
    private static final int CONNECT_TIMEOUT_MS = 800;
    private static final int READ_TIMEOUT_MS = 800;

    static final String VERSION_URL = "https://www.lexiclash.live/api/version";

    private BuildWatchdog() {}

    /** Outcome of a probe: should the caller clear the WebView cache? */
    public static final class Result {
        public final boolean stale;
        Result(boolean stale) { this.stale = stale; }
        public static Result noop() { return new Result(false); }
    }

    /**
     * Blocking staleness probe with a hard {@value #PROBE_TIMEOUT_MS} ms
     * budget (fail-open). Safe to call on the main thread before the bridge
     * navigates; typically adds only the server's round-trip to cold start.
     */
    public static Result probe(Context ctx) {
        if (!isOnline(ctx)) return Result.noop();
        final AtomicReference<String> fetched = new AtomicReference<>(null);
        final CountDownLatch latch = new CountDownLatch(1);
        Thread t = new Thread(() -> {
            try {
                fetched.set(fetchBuildTime(VERSION_URL));
            } catch (Throwable th) {
                Log.w(TAG, "version probe failed: " + th.getMessage());
            } finally {
                latch.countDown();
            }
        }, "build-watchdog");
        t.setDaemon(true);
        t.start();
        try {
            if (!latch.await(PROBE_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
                Log.w(TAG, "version probe timed out — fail open");
                return Result.noop();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Result.noop();
        }
        String build = fetched.get();
        if (build == null) return Result.noop();

        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String last = prefs.getString(KEY_LAST_BUILD, null);
        // Baseline is updated on every successful probe so the NEXT cold
        // start compares against the freshest known server state.
        prefs.edit().putString(KEY_LAST_BUILD, build).apply();
        return new Result(BuildWatchdogPolicy.isStale(last, build));
    }

    /** GET {@code /api/version}, bypassing every cache layer. */
    static String fetchBuildTime(String url) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
        conn.setReadTimeout(READ_TIMEOUT_MS);
        conn.setUseCaches(false);
        conn.setRequestProperty("Cache-Control", "no-cache, no-store, must-revalidate");
        conn.setRequestProperty("Pragma", "no-cache");
        try {
            if (conn.getResponseCode() != HttpURLConnection.HTTP_OK) return null;
            StringBuilder body = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
            }
            return new JSONObject(body.toString()).optString("buildTime", null);
        } finally {
            conn.disconnect();
        }
    }

    private static boolean isOnline(Context ctx) {
        try {
            ConnectivityManager cm =
                (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return true; // fail open — same policy as MainActivity
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Network net = cm.getActiveNetwork();
                if (net == null) return false;
                NetworkCapabilities caps = cm.getNetworkCapabilities(net);
                if (caps == null) return false;
                return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN);
            }
            android.net.NetworkInfo info = cm.getActiveNetworkInfo();
            return info != null && info.isConnected();
        } catch (Throwable th) {
            return true; // never let a connectivity glitch block the launch
        }
    }
}
