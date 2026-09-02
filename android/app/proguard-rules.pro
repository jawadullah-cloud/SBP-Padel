# SBP-Padel release build rules.
# JavascriptInterface methods are invoked from the WebView and must retain names.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
