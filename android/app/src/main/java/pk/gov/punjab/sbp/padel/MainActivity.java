package pk.gov.punjab.sbp.padel;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String PREFS = "sbp_padel_android";
    private static final String KEY_HOST = "laptop_ip";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(6, 16, 18));
        getWindow().setNavigationBarColor(Color.rgb(6, 16, 18));
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(6, 16, 18));
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(webView);
        applySystemBarInsets();
        configureWebView();

        String host = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_HOST, "");
        if (host == null || host.trim().isEmpty()) {
            showHostDialog();
        } else {
            loadPlayer(host.trim());
        }
    }

    private void applySystemBarInsets() {
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            int left;
            int top;
            int right;
            int bottom;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                left = bars.left;
                top = bars.top;
                right = bars.right;
                bottom = bars.bottom;
            } else {
                left = insets.getSystemWindowInsetLeft();
                top = insets.getSystemWindowInsetTop();
                right = insets.getSystemWindowInsetRight();
                bottom = insets.getSystemWindowInsetBottom();
            }
            view.setPadding(left, top, right, bottom);
            return insets;
        });
        webView.requestApplyInsets();
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(false);
        settings.setTextZoom(100);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                Toast.makeText(MainActivity.this,
                        "Could not reach the SBP Padel player server: " + description,
                        Toast.LENGTH_LONG).show();
            }
        });
    }

    private void showHostDialog() {
        final EditText input = new EditText(this);
        input.setHint("Example: 192.168.1.25");
        input.setSingleLine(true);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        FrameLayout holder = new FrameLayout(this);
        holder.setPadding(pad, 0, pad, 0);
        holder.addView(input, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        new AlertDialog.Builder(this)
                .setTitle("Connect to SBP Padel development server")
                .setMessage("Enter the laptop IPv4 address shown by run_player_lan.ps1. The phone and laptop must be on the same Wi-Fi network.")
                .setView(holder)
                .setCancelable(false)
                .setPositiveButton("CONNECT", (dialog, which) -> {
                    String host = input.getText().toString().trim();
                    if (host.isEmpty()) {
                        showHostDialog();
                        return;
                    }
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
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
