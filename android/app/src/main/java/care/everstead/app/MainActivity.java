package care.everstead.app;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Capacitor requires custom plugins to be registered before super.onCreate().
        registerPlugin(MediaPickKeepAlivePlugin.class);
        super.onCreate(savedInstanceState);
        keepWebViewRendererAlive();
    }

    // One UI aggressively kills a backgrounded WebView's *renderer* process to
    // reclaim memory. When it does, Capacitor reloads the page on resume and every
    // bit of in-memory app state is lost. That is exactly what broke media upload:
    // opening the system photo/file picker backgrounds Everstead, One UI kills the
    // renderer, and on return the composer (and the file the user just picked) is
    // gone — dumping them back on the messages list. In-webview capture survives
    // only because it never backgrounds the app.
    //
    // Telling the WebView NOT to waive its renderer priority when it isn't visible
    // keeps that renderer alive across the pick, so the picked file lands back in a
    // live page. This is a plain WebView setting — no foreground service, so no
    // Play-review surface. (API 26+; below that the renderer isn't a separate
    // killable process in the same way.)
    private void keepWebViewRendererAlive() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        }
    }
}
