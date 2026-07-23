package care.everstead.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.provider.OpenableColumns;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

// Native gallery pick + keep-alive around it.
//
// Why native: the WebView's own file-chooser chain (onShowFileChooser →
// DocumentsUI trampoline → Photo Picker → back through both) silently dropped
// the result on a Galaxy Fold 7 — the picker returned, but no change event ever
// reached the page, even with the process, activity, and webview all alive.
// This plugin launches the system photo picker DIRECTLY (no trampoline) and
// returns the picked content:// URI through Capacitor's plugin channel, which
// also persists the call across process death. The page then reads the bytes
// via Capacitor's /_capacitor_content_ proxy (fetch → blob → File).
//
// MediaPickService (a short foreground service) runs for the duration of the
// pick so One UI's low-memory killer can't reap the process while the picker
// is in the foreground — a repeatedly observed kill on this device.
@CapacitorPlugin(name = "MediaPickKeepAlive")
public class MediaPickKeepAlivePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        startKeepAlive();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopKeepAlive();
        call.resolve();
    }

    @PluginMethod
    public void pick(PluginCall call) {
        String kind = call.getString("kind", "photo");
        String mime = "video".equals(kind) ? "video/*" : "image/*";

        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // The dedicated photo-picker activity (gallery grid, no storage
            // permission needed). setType restricts to the requested kind.
            intent = new Intent(MediaStore.ACTION_PICK_IMAGES);
            intent.setType(mime);
        } else {
            intent = legacyPickIntent(mime);
        }

        startKeepAlive();
        try {
            startActivityForResult(call, intent, "pickResult");
        } catch (ActivityNotFoundException e) {
            // No photo picker on this device — fall back to the documents UI.
            try {
                startActivityForResult(call, legacyPickIntent(mime), "pickResult");
            } catch (Exception e2) {
                stopKeepAlive();
                call.reject("no_picker");
            }
        }
    }

    private Intent legacyPickIntent(String mime) {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(mime);
        return i;
    }

    @ActivityCallback
    private void pickResult(PluginCall call, ActivityResult result) {
        stopKeepAlive();
        if (call == null) return;

        Intent data = result.getData();
        Uri uri = (result.getResultCode() == Activity.RESULT_OK && data != null) ? data.getData() : null;
        if (uri == null) {
            call.reject("cancelled");
            return;
        }

        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        String mime = null;
        String name = null;
        long size = 0;
        try {
            mime = getContext().getContentResolver().getType(uri);
        } catch (Exception ignored) { /* type stays unknown */ }
        try (Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int ni = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int si = c.getColumnIndex(OpenableColumns.SIZE);
                if (ni >= 0) name = c.getString(ni);
                if (si >= 0) size = c.getLong(si);
            }
        } catch (Exception ignored) { /* metadata is best-effort */ }
        ret.put("mime", mime != null ? mime : "");
        ret.put("name", name != null ? name : "");
        ret.put("size", size);
        call.resolve(ret);
    }

    private void startKeepAlive() {
        Intent i = new Intent(getContext(), MediaPickService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(i);
            } else {
                getContext().startService(i);
            }
        } catch (Exception e) {
            // If the OS refuses (rare), proceed without the keep-alive rather
            // than blocking the pick.
        }
    }

    private void stopKeepAlive() {
        try {
            getContext().stopService(new Intent(getContext(), MediaPickService.class));
        } catch (Exception e) {
            // Already stopped.
        }
    }
}
