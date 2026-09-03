package live.lexiclash.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    private static final String DEFAULT_CHANNEL_ID = "default";

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Required marker method for @capgo/capacitor-social-login
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Crash logger installed in LexiClashApplication.attachBaseContext —
        // earlier than this hook so ContentProvider init failures get captured too.
        super.onCreate(savedInstanceState);

        // Edge-to-edge (Android 15+): WebView draws behind transparent system bars;
        // useSafeArea (JS) reads the insets into CSS vars. MUST run after
        // super.onCreate() so it doesn't disturb the splash window-bg teardown.
        EdgeToEdge.enable(this, SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT));

        // Paint everything behind the page opaque navy. Under edge-to-edge both the
        // window background and the WebView composite transparently by default, so
        // any area the page doesn't cover — or any hole a native overlay's SurfaceView
        // (e.g. an ad) punches through the WebView — reveals the @drawable/splash
        // window background as a stray LEXI logo. Forcing both navy makes those areas
        // seamless navy instead. (Navy still draws behind the transparent bars.)
        getWindow().setBackgroundDrawable(new ColorDrawable(0xFF1A1A2E));
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) webView.setBackgroundColor(0xFF1A1A2E);

        ensureDefaultNotificationChannel();
        handleDeepLinkIntent(getIntent());
    }

    /**
     * BridgeActivity.load() constructs the Bridge, which immediately
     * {@code loadUrl(server.url)}. Cache-mode and our WebViewClient MUST be
     * installed in this override (right after super.load) — putting them in
     * onCreate after super.onCreate is too late: the first remote navigation
     * has already been dispatched with Capacitor's default client, which
     * calls {@code super.onReceivedError} and lets Chromium paint its stock
     * interstitial (device screenshot 2026-09-03, URL
     * {@code /he/connections/pyramid}).
     */
    @Override
    protected void load() {
        super.load();
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;

        webView.getSettings().setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        // Never persist/restore the last remote URL. Android's default WebView
        // save/restore relaunches into a deep route (e.g. /he/connections/pyramid)
        // which is uncached and paints Chromium's stock interstitial offline.
        webView.setSaveEnabled(false);
        getBridge().setWebViewClient(new OfflineAwareWebViewClient(getBridge()));

        if (!isNetworkAvailable()) {
            String errorUrl = getBridge().getErrorUrl();
            if (errorUrl != null) {
                try {
                    webView.stopLoading();
                } catch (Throwable ignored) {}
                // super.load() already dispatched loadUrl(server.url) with
                // Capacitor's default client. Post so we replace that
                // navigation (and any Chromium interstitial) on the next
                // looper turn, after our client is installed.
                webView.post(() -> {
                    try {
                        webView.loadUrl(errorUrl);
                    } catch (Throwable t) {
                        android.util.Log.w("MainActivity", "offline fallback: " + t.getMessage());
                    }
                });
            }
        }
    }

    /**
     * Fail OPEN (return true) on any lookup error so a permission/OEM glitch
     * never traps an online user on error.html. Airplane mode / no active
     * network → false → load bundled error.html instead of the remote URL.
     */
    private boolean isNetworkAvailable() {
        try {
            ConnectivityManager cm =
                (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return true;
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
        } catch (Throwable t) {
            return true;
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent);
    }

    /**
     * Skip default view-hierarchy restore. A remote-URL Capacitor WebView
     * otherwise relaunches into the last deep route (device: /he/connections/pyramid)
     * which is not in the HTTP cache and shows ERR_INTERNET_DISCONNECTED.
     * Plugin state is restored separately via Bridge.restoreInstanceState.
     */
    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {
        // do not call super — drops WebView URL restore only (no other
        // native widgets hold instance state in this activity).
    }

    /**
     * When backgrounded, pause this WebView's extra processing (animations,
     * geolocation, rendering) to lower idle CPU and shrink the working set, so
     * Android's low-memory killer is less likely to evict our process — the
     * "app reloads from scratch when you reopen it" symptom on remote-URL
     * Capacitor apps.
     *
     * DO NOT call WebView.pauseTimers()/resumeTimers() here. Those are
     * PROCESS-GLOBAL (documented: "pauses all layout, parsing, and JavaScript
     * timers for ALL WebViews"). A rewarded AdMob ad renders its creative — and
     * the "Reward in 30 seconds" countdown of HTML/MRAID creatives — in ITS OWN
     * WebView inside a fullscreen AdActivity. When that Activity fronts, this
     * MainActivity gets onPause(); a global pauseTimers() then froze the ad's
     * countdown WebView too → countdown stuck at 30 → reward never granted →
     * player stranded ("reward ads stuck at 30sec"). pauseTimers() was added in
     * 954c11207 for background-eviction; the instance onPause()/onResume() below
     * keep that benefit without freezing other WebViews. Per-instance only.
     */
    @Override
    public void onPause() {
        super.onPause();
        WebView bridgeWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (bridgeWebView != null) {
            try {
                bridgeWebView.onPause();
            } catch (Throwable t) {
                android.util.Log.w("MainActivity", "WebView pause failed: " + t.getMessage());
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        WebView bridgeWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (bridgeWebView != null) {
            try {
                bridgeWebView.onResume();
            } catch (Throwable t) {
                android.util.Log.w("MainActivity", "WebView resume failed: " + t.getMessage());
            }
        }
    }

    private void ensureDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (nm.getNotificationChannel(DEFAULT_CHANNEL_ID) != null) return;
            NotificationChannel channel = new NotificationChannel(
                DEFAULT_CHANNEL_ID,
                "General",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("General notifications");
            nm.createNotificationChannel(channel);
        } catch (Throwable t) {
            android.util.Log.w("MainActivity", "channel create failed: " + t.getMessage());
        }
    }

    private void handleDeepLinkIntent(Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        String dataString = intent.getDataString();

        if (Intent.ACTION_VIEW.equals(action) && dataString != null) {
            if (dataString.contains("auth/callback")) {
                moveTaskToFront();
            }
        }
    }

    private void moveTaskToFront() {
        try {
            android.app.ActivityManager activityManager =
                (android.app.ActivityManager) getSystemService(ACTIVITY_SERVICE);
            if (activityManager != null) {
                activityManager.moveTaskToFront(getTaskId(),
                    android.app.ActivityManager.MOVE_TASK_WITH_HOME);
            }
        } catch (SecurityException e) {
            android.util.Log.w("MainActivity", "Could not move task to front: " + e.getMessage());
        }
    }
}
