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
// while the OS media/file picker is open. On memory-tight devices (notably
// Samsung One UI) a backgrounded web-view app is a prime low-memory-killer target
// and gets reaped mid-pick — destroying the composer AND the file the user just
// chose. A foreground service moves the process well below the reap threshold for
// the few seconds the picker is up. It is stopped the instant the app returns to
// the foreground (see lib/pickKeepAlive.js), so the notification barely shows.
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
        // We stop it explicitly from JS; if the system ever restarts it, don't
        // re-deliver the intent.
        return START_NOT_STICKY;
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
