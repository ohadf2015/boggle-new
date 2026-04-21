package live.lexiclash.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.Date;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    private static final String CRASH_LOG = "last_crash.txt";
    private static final String DEFAULT_CHANNEL_ID = "default";

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Required marker method for @capgo/capacitor-social-login
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        installCrashLogger();
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

    private void installCrashLogger() {
        final Thread.UncaughtExceptionHandler previous =
            Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            try {
                File out = new File(getFilesDir(), CRASH_LOG);
                try (PrintWriter pw = new PrintWriter(new FileWriter(out, false))) {
                    pw.println("timestamp=" + new Date().toString());
                    pw.println("thread=" + thread.getName());
                    throwable.printStackTrace(pw);
                }
                android.util.Log.e("LexiclashCrash", "Fatal", throwable);
            } catch (Throwable ignored) {
                // never let the logger itself mask the crash
            }
            if (previous != null) {
                previous.uncaughtException(thread, throwable);
            }
        });
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
