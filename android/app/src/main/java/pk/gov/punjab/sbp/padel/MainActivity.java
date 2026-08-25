package pk.gov.punjab.sbp.padel;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
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
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String PREFS = "sbp_padel_android";
    private static final String KEY_HOST = "laptop_ip";
    private static final int FILE_CHOOSER_REQUEST = 501;
    private static final int GOOGLE_SIGN_IN_REQUEST = 502;
    private static final int LOCATION_REQUEST = 503;

    private FrameLayout root;
    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private GoogleSignInClient googleSignInClient;
    private String playerHost = "";
    private String pendingGeoOrigin;
    private GeolocationPermissions.Callback pendingGeoCallback;

    @Override protected void onCreate(Bundle savedInstanceState) { super.onCreate(savedInstanceState); getWindow().setStatusBarColor(Color.rgb(6,16,18)); getWindow().setNavigationBarColor(Color.BLACK); getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE); root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(6,16,18));root.setClipToPadding(true);webView=new WebView(this);webView.setBackgroundColor(Color.rgb(6,16,18));webView.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));root.addView(webView);setContentView(root);configureSystemUi();configureWebView();configureBackNavigation();String host=getSharedPreferences(PREFS,MODE_PRIVATE).getString(KEY_HOST,"");if(host==null||host.trim().isEmpty())showHostDialog();else loadPlayer(host.trim()); }
    private int dp(float value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private void configureSystemUi(){if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.R){getWindow().setDecorFitsSystemWindows(false);WindowInsetsController controller=getWindow().getInsetsController();if(controller!=null){controller.hide(WindowInsets.Type.navigationBars());controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);}root.setOnApplyWindowInsetsListener((view,insets)->{android.graphics.Insets status=insets.getInsetsIgnoringVisibility(WindowInsets.Type.statusBars()),cutout=insets.getInsets(WindowInsets.Type.displayCutout()),ime=insets.getInsets(WindowInsets.Type.ime());boolean imeVisible=insets.isVisible(WindowInsets.Type.ime());view.setPadding(Math.max(status.left,cutout.left),Math.max(status.top,cutout.top)+dp(4),Math.max(status.right,cutout.right),imeVisible?ime.bottom:0);view.post(()->{if(webView!=null)webView.evaluateJavascript("document.documentElement.classList.toggle('sbp-keyboard-open',"+(imeVisible?"true":"false")+");"+(imeVisible?"setTimeout(function(){window.SBPAndroidRevealFocused&&window.SBPAndroidRevealFocused()},40);setTimeout(function(){window.SBPAndroidRevealFocused&&window.SBPAndroidRevealFocused()},220);":""),null);});return insets;});root.requestApplyInsets();}else{getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);root.setOnApplyWindowInsetsListener((view,insets)->{view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop()+dp(4),insets.getSystemWindowInsetRight(),0);return insets;});root.requestApplyInsets();}}
    private void configureWebView(){WebSettings settings=webView.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setDatabaseEnabled(true);settings.setGeolocationEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);settings.setLoadWithOverviewMode(false);settings.setUseWideViewPort(false);settings.setTextZoom(100);webView.setVerticalScrollBarEnabled(false);webView.setOverScrollMode(View.OVER_SCROLL_NEVER);webView.addJavascriptInterface(new AndroidBridge(),"SBPAndroid");webView.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> cb,FileChooserParams params){if(fileChooserCallback!=null)fileChooserCallback.onReceiveValue(null);fileChooserCallback=cb;Intent intent=params.createIntent();intent.setType("image/*");intent.addCategory(Intent.CATEGORY_OPENABLE);try{startActivityForResult(intent,FILE_CHOOSER_REQUEST);return true;}catch(Exception e){fileChooserCallback=null;Toast.makeText(MainActivity.this,"No photo picker is available on this device.",Toast.LENGTH_LONG).show();return false;}}@Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback){if(Build.VERSION.SDK_INT<Build.VERSION_CODES.M||checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED||checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED){callback.invoke(origin,true,false);return;}pendingGeoOrigin=origin;pendingGeoCallback=callback;requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},LOCATION_REQUEST);}});webView.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if("http".equalsIgnoreCase(uri.getScheme())&&playerHost.equalsIgnoreCase(uri.getHost())&&uri.getPort()==5173)return false;openExternalUri(uri);return true;}@Override public void onPageFinished(WebView view,String url){super.onPageFinished(view,url);rehideNavigationBar();root.requestApplyInsets();}@Override public void onReceivedError(WebView view,int errorCode,String description,String failingUrl){Toast.makeText(MainActivity.this,"Could not reach the SBP Padel player server: "+description,Toast.LENGTH_LONG).show();}});}
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults){super.onRequestPermissionsResult(requestCode,permissions,grantResults);if(requestCode!=LOCATION_REQUEST)return;boolean granted=false;for(int r:grantResults)if(r==PackageManager.PERMISSION_GRANTED){granted=true;break;}if(pendingGeoCallback!=null&&pendingGeoOrigin!=null)pendingGeoCallback.invoke(pendingGeoOrigin,granted,false);pendingGeoCallback=null;pendingGeoOrigin=null;}
    private void configureBackNavigation(){if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.TIRAMISU)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBackNavigation);}
    private void handleBackNavigation(){if(webView==null){finish();return;}webView.evaluateJavascript("(function(){try{return !!(window.SBPHandleAndroidBack&&window.SBPHandleAndroidBack())}catch(e){return false}})()",value->runOnUiThread(()->{if("true".equalsIgnoreCase(String.valueOf(value)))return;if(webView.canGoBack())webView.goBack();else finish();}));}
    public class AndroidBridge{@JavascriptInterface public void googleSignIn(String webClientId){runOnUiThread(()->startGoogleSignIn(webClientId));}@JavascriptInterface public void openExternal(String rawUrl){runOnUiThread(()->{try{Uri uri=Uri.parse(rawUrl==null?"":rawUrl.trim());String scheme=uri.getScheme();if(!"https".equalsIgnoreCase(scheme)&&!"http".equalsIgnoreCase(scheme)){Toast.makeText(MainActivity.this,"Unsupported external link.",Toast.LENGTH_SHORT).show();return;}openExternalUri(uri);}catch(Exception e){Toast.makeText(MainActivity.this,"Could not open this link.",Toast.LENGTH_LONG).show();}});}}
    private void openExternalUri(Uri uri){try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){Toast.makeText(this,"No app is available to open this link.",Toast.LENGTH_LONG).show();}}
    private void startGoogleSignIn(String webClientId){if(webClientId==null||webClientId.trim().isEmpty()){sendGoogleError("Google sign-in is not configured.");return;}GoogleSignInOptions options=new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN).requestIdToken(webClientId.trim()).requestEmail().build();googleSignInClient=GoogleSignIn.getClient(this,options);startActivityForResult(googleSignInClient.getSignInIntent(),GOOGLE_SIGN_IN_REQUEST);}
    private void sendGoogleCredential(String credential){if(webView!=null){String encoded=JSONObject.quote(credential);webView.post(()->webView.evaluateJavascript("window.SBPGoogleNativeResult&&window.SBPGoogleNativeResult("+encoded+")",null));}}
    private void sendGoogleError(String message){if(webView!=null){String encoded=JSONObject.quote(message);webView.post(()->webView.evaluateJavascript("window.SBPGoogleNativeError&&window.SBPGoogleNativeError("+encoded+")",null));}}
    private void rehideNavigationBar(){if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.R){WindowInsetsController c=getWindow().getInsetsController();if(c!=null){c.hide(WindowInsets.Type.navigationBars());c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);}}else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);}
    @Override public void onWindowFocusChanged(boolean hasFocus){super.onWindowFocusChanged(hasFocus);if(hasFocus){rehideNavigationBar();root.requestApplyInsets();}}
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);if(requestCode==GOOGLE_SIGN_IN_REQUEST){Task<GoogleSignInAccount> task=GoogleSignIn.getSignedInAccountFromIntent(data);try{GoogleSignInAccount account=task.getResult(ApiException.class);String credential=account!=null?account.getIdToken():null;if(credential==null||credential.isEmpty())sendGoogleError("Google did not return an identity token.");else sendGoogleCredential(credential);}catch(ApiException e){sendGoogleError(e.getStatusCode()==12501?"Google sign-in was cancelled.":"Google sign-in failed (code "+e.getStatusCode()+").");}return;}if(requestCode!=FILE_CHOOSER_REQUEST||fileChooserCallback==null)return;fileChooserCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode,data));fileChooserCallback=null;}
    private void showHostDialog(){final EditText input=new EditText(this);input.setHint("Example: 192.168.1.25");input.setSingleLine(true);input.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_URI);int pad=dp(20);FrameLayout holder=new FrameLayout(this);holder.setPadding(pad,0,pad,0);holder.addView(input,new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT));new AlertDialog.Builder(this).setTitle("Connect to SBP Padel development server").setMessage("Enter the laptop IPv4 address shown by run_player_lan.ps1. The phone and laptop must be on the same Wi-Fi network.").setView(holder).setCancelable(false).setPositiveButton("CONNECT",(dialog,which)->{String host=input.getText().toString().trim();if(host.isEmpty()){showHostDialog();return;}getSharedPreferences(PREFS,MODE_PRIVATE).edit().putString(KEY_HOST,host).apply();loadPlayer(host);}).show();}
    private void loadPlayer(String host){playerHost=host;String api="http://"+host+":8000/api/v1";webView.loadUrl("http://"+host+":5173/auth-preview.html?api="+api);}
    @Override public void onBackPressed(){if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.TIRAMISU)return;handleBackNavigation();}
}
