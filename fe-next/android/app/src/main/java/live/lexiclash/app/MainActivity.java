package live.lexiclash.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
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
        //
        // Edge-to-edge: WebView extends behind status + navigation bars; useSafeArea
        // hook (JS) reads insets and exposes them as CSS vars so layout adapts.
        // EdgeToEdge.enable() (AndroidX) is the forward-compatible replacement for the
        // setStatusBarColor / setNavigationBarColor / setDecorFitsSystemWindows path
        // deprecated in Android 15 (API 35): a no-op on API 35+ where edge-to-edge is
        // enforced by the platform, and a back-fill of the same transparent bars + light
        // (white) icons on older APIs. SystemBarStyle.dark(TRANSPARENT) = transparent
        // scrim with light icons — our app is dark navy, so the bg shows through and the
        // gesture-nav pill blends seamlessly. Called before super.onCreate() (AndroidX
        // canonical placement) so window flags are set before BridgeActivity wires up
        // the WebView. Per-route bar icon tint is then handled in JS (useStatusBarTint).
        EdgeToEdge.enable(
            this,
            SystemBarStyle.dark(Color.TRANSPARENT),
            SystemBarStyle.dark(Color.TRANSPARENT)
        );
        super.onCreate(savedInstanceState);
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
