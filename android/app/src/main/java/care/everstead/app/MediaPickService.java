package care.everstead.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

// A short-lived foreground service that holds Everstead at foreground priority
// while the OS media picker is open. On memory-tight devices (notably Samsung
// One UI) a backgrounded web-view app is a prime low-memory-killer target and
// gets reaped mid-pick — destroying the composer AND the file the user just
// chose. A foreground service moves the process well below the reap threshold
// for the duration of the pick. Started and stopped by
// MediaPickKeepAlivePlugin around each pick, so the notification barely shows.
public class MediaPickService extends Service {
    private static final String CHANNEL_ID = "media_pick";
    private static final int NOTIF_ID = 4711;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE);
        } else {
            startForeground(NOTIF_ID, notification);
        }
        // The plugin stops it when the pick resolves; if the system ever
        // restarts it, don't re-deliver the intent.
        return START_NOT_STICKY;
    }

    // Android 14+ gives a shortService ~3 minutes, then calls onTimeout(); a
    // service that doesn't stop itself promptly gets the app killed with an
    // ANR ("A foreground service ... did not stop within its timeout") — i.e.
    // parking in the gallery for >3 minutes would crash the app the keep-alive
    // exists to protect. Losing FGS priority is strictly better than dying;
    // the pick itself continues unprotected.
    @Override
    public void onTimeout(int startId) {
        stopSelf();
    }

    private Notification buildNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Attaching media", NotificationManager.IMPORTANCE_LOW);
                ch.setShowBadge(false);
                nm.createNotificationChannel(ch);
            }
        }
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Attaching your file…")
            .setContentText("Keeping Everstead open while you choose a photo or video.")
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
