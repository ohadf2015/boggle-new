package live.lexiclash.app;

import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Device-verified 2026-09-03: Capacitor's BridgeWebViewClient calls
 * {@code super.onReceivedError} BEFORE {@code loadUrl(errorPath)}. Chromium
 * then commits its stock "Web page not available / ERR_INTERNET_DISCONNECTED"
 * interstitial and ignores the subsequent load of our bundled error.html —
 * which is exactly the screen the user still sees after the APK rebuild.
 *
 * This client skips {@code super} on main-frame network failures and posts a
 * load of Capacitor's local error URL ({@code https://localhost/error.html}),
 * which WebViewLocalServer serves from APK assets. Subresource errors pass
 * through so images/XHR failures don't hijack the document.
 */
public class OfflineAwareWebViewClient extends BridgeWebViewClient {

    private final Bridge bridge;

    public OfflineAwareWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if (request != null && request.isForMainFrame()) {
            loadBundledFallback(view);
            return;
        }
        super.onReceivedError(view, request, error);
    }

    @Override
    public void onReceivedHttpError(
        WebView view,
        WebResourceRequest request,
        WebResourceResponse errorResponse
    ) {
        // Only bounce the document on hard server failures. 4xx on a real page
        // (auth, not-found) must stay visible; 5xx while offline-ish is the
        // same dead-end as a network error for a remote-URL app.
        int status = errorResponse != null ? errorResponse.getStatusCode() : 0;
        if (request != null && request.isForMainFrame() && status >= 500) {
            loadBundledFallback(view);
            return;
        }
        super.onReceivedHttpError(view, request, errorResponse);
    }

    private void loadBundledFallback(WebView view) {
        if (view == null) return;
        String errorUrl = bridge.getErrorUrl();
        if (errorUrl == null || errorUrl.isEmpty()) return;
        String current = view.getUrl();
        if (errorUrl.equals(current)) return;
        try {
            view.stopLoading();
        } catch (Throwable ignored) {
            // never let stopLoading itself mask the fallback
        }
        // loadUrl from inside onReceivedError is ignored on some Chromium
        // builds unless posted to the next looper turn.
        view.post(() -> {
            try {
                if (!errorUrl.equals(view.getUrl())) {
                    view.loadUrl(errorUrl);
                }
            } catch (Throwable t) {
                android.util.Log.w("LexiClash", "offline fallback load failed: " + t.getMessage());
            }
        });
    }
}
