package care.everstead.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageDecoder;
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

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

// Native gallery pick + keep-alive around it.
//
// Why native: the WebView's own file-chooser chain (onShowFileChooser →
// DocumentsUI trampoline → Photo Picker → back through both) silently dropped
// the result on a Galaxy Fold 7. This plugin launches the system photo picker
// DIRECTLY and returns the result through Capacitor's plugin channel, which
// also persists the call across process death.
//
// Why transcode: Samsung saves photos as HEIC (often with a .jpg display name
// and image/jpeg mime). Web engines cannot decode HEIC — the picked photo
// attaches fine but renders as a broken image in the app, on the website, and
// for delegates. Android itself decodes HEIC natively, so photos are re-encoded
// to real JPEG here (downscaled to ≤2048px; ImageDecoder also applies EXIF
// orientation). Videos are returned untouched.
//
// MediaPickService (a short foreground service) runs for the duration of the
// pick so One UI's low-memory killer can't reap the process while the picker
// is in the foreground — a repeatedly observed kill on this device.
@CapacitorPlugin(name = "MediaPickKeepAlive")
public class MediaPickKeepAlivePlugin extends Plugin {

    private static final int MAX_PHOTO_DIMENSION = 2048;

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

        // Best-effort cleanup of transcodes from earlier picks — by the time a
        // new pick starts, the previous file's bytes already live in the page
        // as a Blob, so the cache copy is dead weight.
        try {
            File[] old = getContext().getCacheDir().listFiles((d, n) -> n.startsWith("picked-"));
            if (old != null) for (File f : old) f.delete();
        } catch (Exception ignored) { }

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

        boolean isPhoto = !"video".equals(call.getString("kind", "photo"));
        // Decode/re-encode is too heavy for the main thread (a 12MP HEIC takes
        // hundreds of ms) — resolve from a worker instead.
        new Thread(() -> resolvePicked(call, uri, isPhoto)).start();
    }

    private void resolvePicked(PluginCall call, Uri uri, boolean isPhoto) {
        String name = null;
        long size = 0;
        String mime = null;
        try {
            mime = getContext().getContentResolver().getType(uri);
        } catch (Exception ignored) { }
        try (Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int ni = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int si = c.getColumnIndex(OpenableColumns.SIZE);
                if (ni >= 0) name = c.getString(ni);
                if (si >= 0) size = c.getLong(si);
            }
        } catch (Exception ignored) { }

        JSObject ret = new JSObject();
        if (isPhoto) {
            try {
                File jpeg = transcodeToJpeg(uri);
                String base = name != null && name.contains(".") ? name.substring(0, name.lastIndexOf('.')) : (name != null ? name : "photo");
                ret.put("path", jpeg.getAbsolutePath());
                ret.put("name", base + ".jpg");
                ret.put("size", jpeg.length());
                ret.put("mime", "image/jpeg");
                call.resolve(ret);
                return;
            } catch (Exception e) {
                // Fall through to the raw URI — better a possibly-HEIC photo
                // than a failed pick.
            }
        }
        ret.put("uri", uri.toString());
        ret.put("name", name != null ? name : "");
        ret.put("size", size);
        ret.put("mime", mime != null ? mime : "");
        call.resolve(ret);
    }

    private File transcodeToJpeg(Uri uri) throws Exception {
        Bitmap bmp;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            ImageDecoder.Source src = ImageDecoder.createSource(getContext().getContentResolver(), uri);
            bmp = ImageDecoder.decodeBitmap(src, (decoder, info, source) -> {
                // Software allocation: Bitmap.compress can't read hardware bitmaps.
                decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
                int w = info.getSize().getWidth();
                int h = info.getSize().getHeight();
                int max = Math.max(w, h);
                if (max > MAX_PHOTO_DIMENSION) {
                    float scale = (float) MAX_PHOTO_DIMENSION / max;
                    decoder.setTargetSize(Math.round(w * scale), Math.round(h * scale));
                }
            });
        } else {
            // Pre-P: bounds-decode first so a huge photo can't OOM the app.
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            try (InputStream is = getContext().getContentResolver().openInputStream(uri)) {
                BitmapFactory.decodeStream(is, null, bounds);
            }
            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inSampleSize = 1;
            int max = Math.max(bounds.outWidth, bounds.outHeight);
            while (max / opts.inSampleSize > MAX_PHOTO_DIMENSION) opts.inSampleSize *= 2;
            try (InputStream is = getContext().getContentResolver().openInputStream(uri)) {
                bmp = BitmapFactory.decodeStream(is, null, opts);
            }
        }
        if (bmp == null) throw new Exception("decode failed");
        File out = new File(getContext().getCacheDir(), "picked-" + System.currentTimeMillis() + ".jpg");
        try (FileOutputStream fos = new FileOutputStream(out)) {
            if (!bmp.compress(Bitmap.CompressFormat.JPEG, 90, fos)) throw new Exception("encode failed");
        } finally {
            bmp.recycle();
        }
        return out;
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
