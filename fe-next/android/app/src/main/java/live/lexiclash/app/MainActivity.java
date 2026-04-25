package live.lexiclash.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    private static final String DEFAULT_CHANNEL_ID = "default";
    private static final int BRAND_NAVY = 0xFF1A1A2E;

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Required marker method for @capgo/capacitor-social-login
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Crash logger installed in LexiClashApplication.attachBaseContext —
        // earlier than this hook so ContentProvider init failures get captured too.
        super.onCreate(savedInstanceState);
        applyEdgeToEdge();
        ensureDefaultNotificationChannel();
        handleDeepLinkIntent(getIntent());
    }

    /**
     * Edge-to-edge: WebView extends behind status + navigation bars.
     * useSafeArea hook (JS) reads insets and exposes them as CSS vars so layout adapts.
     * Bars become transparent so navy app bg shows through — predictive back gesture
     * pill (Android 10+ gesture nav) blends seamlessly.
     */
    private void applyEdgeToEdge() {
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            window.setNavigationBarColor(Color.TRANSPARENT);
        } else {
            window.setNavigationBarColor(BRAND_NAVY);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            // Hint that nav bar bg is dark — system divider/contrast adjusts
            window.setNavigationBarDividerColor(Color.TRANSPARENT);
        }
        WindowInsetsControllerCompat controller =
            new WindowInsetsControllerCompat(window, window.getDecorView());
        // Light icons (white) on both bars — our app is dark-themed
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent);
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
