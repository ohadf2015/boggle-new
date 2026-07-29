package live.lexiclash.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
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

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent);
    }

    /**
     * When backgrounded, freeze WebView JS timers + layout work. Lowers idle CPU
     * and shrinks the WebView's working set so Android's low-memory killer is
     * less likely to evict our process — which is what causes the "app reloads
     * from scratch when you reopen it" symptom on remote-URL Capacitor apps.
     * pauseTimers()/resumeTimers() are process-global on WebView; safe here
     * because there is only one WebView in this Activity.
     */
    @Override
    public void onPause() {
        super.onPause();
        WebView bridgeWebView = getBridge() != null ? getBridge().getWebView() : null;
        if (bridgeWebView != null) {
            try {
                bridgeWebView.pauseTimers();
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
                bridgeWebView.resumeTimers();
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
