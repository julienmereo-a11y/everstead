package care.everstead.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

// Relay for the OAuth deep link (care.everstead.app://auth-callback).
//
// MainActivity must keep launchMode="standard" (singleTask/singleTop break the
// WebView file-chooser results the Vault document upload depends on) — but a
// VIEW intent aimed straight at a standard activity would spawn a SECOND
// MainActivity instance. This trampoline receives the deep link instead and
// re-delivers it to the EXISTING MainActivity with CLEAR_TOP|SINGLE_TOP, which
// (a) routes the URL through onNewIntent → Capacitor's appUrlOpen, and
// (b) pops the Chrome Custom Tab sitting above MainActivity, closing the
// browser sheet in the same motion.
public class AuthRedirectActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Uri data = getIntent() != null ? getIntent().getData() : null;
        Intent relay = new Intent(this, MainActivity.class);
        relay.setData(data);
        relay.setAction(Intent.ACTION_VIEW);
        relay.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(relay);
        finish();
    }
}
