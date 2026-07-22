package care.everstead.app;

import android.content.Intent;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// JS bridge to start/stop MediaPickService around a system file pick.
@CapacitorPlugin(name = "MediaPickKeepAlive")
public class MediaPickKeepAlivePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        Intent i = new Intent(getContext(), MediaPickService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(i);
            } else {
                getContext().startService(i);
            }
        } catch (Exception e) {
            // If the OS refuses to start it (rare), just proceed without the
            // keep-alive rather than blocking the pick.
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            getContext().stopService(new Intent(getContext(), MediaPickService.class));
        } catch (Exception e) {
            // Already stopped.
        }
        call.resolve();
    }
}
