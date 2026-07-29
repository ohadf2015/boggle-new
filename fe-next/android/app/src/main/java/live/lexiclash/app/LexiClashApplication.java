package live.lexiclash.app;

import android.app.Application;
import android.content.Context;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.Date;

public class LexiClashApplication extends Application {

    private static final String CRASH_LOG = "last_crash.txt";

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        installCrashLogger();
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
                    pw.println("stage=application");
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
}
