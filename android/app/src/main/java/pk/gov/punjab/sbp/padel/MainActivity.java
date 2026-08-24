package pk.gov.punjab.sbp.padel;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String PREFS = "sbp_padel_android";
    private static final String KEY_HOST = "laptop_ip";
    private static final int FILE_CHOOSER_REQUEST = 501;
    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(6, 16, 18));
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(6, 16, 18));
        webView.setClipToPadding(true);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(webView);
        configureSystemUi();
        configureWebView();

        String host = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_HOST, "");
        if (host == null || host.trim().isEmpty()) showHostDialog();
        else loadPlayer(host.trim());
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void configureSystemUi() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 15 / targetSdk 35 is edge-to-edge by default. Own the
            // insets explicitly so player content never sits under the status
            // bar and the IME physically reduces the usable WebView area.
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
            webView.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets status = insets.getInsets(WindowInsets.Type.statusBars());
                android.graphics.Insets cutout = insets.getInsets(WindowInsets.Type.displayCutout());
                android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
                boolean imeVisible = insets.isVisible(WindowInsets.Type.ime());
                int left = Math.max(status.left, cutout.left);
                int top = Math.max(status.top, cutout.top) + dp(6);
                int right = Math.max(status.right, cutout.right);
                int bottom = imeVisible ? ime.bottom : 0;
                view.setPadding(left, top, right, bottom);

                final float cssIme = bottom / getResources().getDisplayMetrics().density;
                view.post(() -> {
                    if (webView == null) return;
                    webView.evaluateJavascript(
                            "document.documentElement.style.setProperty('--sbp-native-ime','" + cssIme + "px');" +
                            "document.documentElement.classList.toggle('sbp-keyboard-open'," + (imeVisible ? "true" : "false") + ");" +
                            (imeVisible ? "window.SBPAndroidRevealFocused&&window.SBPAndroidRevealFocused();" : ""),
                            null);
                });
                return insets;
            });
            webView.requestApplyInsets();
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
            webView.setOnApplyWindowInsetsListener((view, insets) -> {
                int top = insets.getSystemWindowInsetTop() + dp(6);
                view.setPadding(insets.getSystemWindowInsetLeft(), top,
                        insets.getSystemWindowInsetRight(), 0);
                return insets;
            });
            webView.requestApplyInsets();
        }
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(false);
        settings.setTextZoom(100);
        webView.setVerticalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                intent.setType("image/*");
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception error) {
                    fileChooserCallback = null;
                    Toast.makeText(MainActivity.this, "No photo picker is available on this device.", Toast.LENGTH_LONG).show();
                    return false;
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                rehideNavigationBar();
                view.requestApplyInsets();
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                Toast.makeText(MainActivity.this,
                        "Could not reach the SBP Padel player server: " + description,
                        Toast.LENGTH_LONG).show();
            }
        });
    }

    private void rehideNavigationBar() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) rehideNavigationBar();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || fileChooserCallback == null) return;
        Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        fileChooserCallback.onReceiveValue(result);
        fileChooserCallback = null;
    }

    private void showHostDialog() {
        final EditText input = new EditText(this);
        input.setHint("Example: 192.168.1.25");
        input.setSingleLine(true);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        int pad = dp(20);
        FrameLayout holder = new FrameLayout(this);
        holder.setPadding(pad, 0, pad, 0);
        holder.addView(input, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        new AlertDialog.Builder(this)
                .setTitle("Connect to SBP Padel development server")
                .setMessage("Enter the laptop IPv4 address shown by run_player_lan.ps1. The phone and laptop must be on the same Wi-Fi network.")
                .setView(holder)
                .setCancelable(false)
                .setPositiveButton("CONNECT", (dialog, which) -> {
                    String host = input.getText().toString().trim();
                    if (host.isEmpty()) { showHostDialog(); return; }
                    getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY_HOST, host).apply();
                    loadPlayer(host);
                })
                .show();
    }

    private void loadPlayer(String host) {
        String api = "http://" + host + ":8000/api/v1";
        String url = "http://" + host + ":5173/auth-preview.html?api=" + api;
        webView.loadUrl(url);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
