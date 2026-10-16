package com.aaria.magickitchen.pilot

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooserRequest = 4312

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.setSupportMultipleWindows(false)
            addJavascriptInterface(ShareBridge(this@MainActivity), "AariaNative")
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView,
                    filePathCallback: ValueCallback<Array<Uri>>,
                    fileChooserParams: FileChooserParams
                ): Boolean {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = filePathCallback
                    return try {
                        startActivityForResult(fileChooserParams.createIntent(), fileChooserRequest)
                        true
                    } catch (_: Exception) {
                        fileChooserCallback = null
                        false
                    }
                }
            }
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val uri = request.url
                    return uri.scheme != "https" || uri.host != "appassets.androidplatform.net"
                }
            }
            loadDataWithBaseURL(
                "https://appassets.androidplatform.net/",
                assets.open("index.html").bufferedReader().use { it.readText() },
                "text/html",
                "UTF-8",
                null
            )
        }
        setContentView(webView)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == fileChooserRequest) {
            val result = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            fileChooserCallback?.onReceiveValue(result)
            fileChooserCallback = null
            return
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        webView.destroy()
        super.onDestroy()
    }

    @Deprecated("Android routes back navigation through the WebView before exiting the pilot.")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}

class ShareBridge(private val activity: Activity) {
    @JavascriptInterface
    fun sharePost(dataUrl: String, title: String) {
        val prefix = "data:image/jpeg;base64,"
        if (!dataUrl.startsWith(prefix)) return
        val bytes = try {
            android.util.Base64.decode(dataUrl.removePrefix(prefix), android.util.Base64.DEFAULT)
        } catch (_: IllegalArgumentException) {
            return
        }
        if (bytes.isEmpty() || bytes.size > 8 * 1024 * 1024) return
        activity.runOnUiThread {
            try {
                val directory = java.io.File(activity.cacheDir, "shared-posts").apply { mkdirs() }
                val name = java.util.UUID.randomUUID().toString() + ".jpg"
                java.io.File(directory, name).writeBytes(bytes)
                val uri = Uri.parse("content://${activity.packageName}.share/post/$name")
                val share = Intent(Intent.ACTION_SEND).apply {
                    type = "image/jpeg"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    putExtra(Intent.EXTRA_TEXT, title)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                activity.startActivity(Intent.createChooser(share, "Share your kitchen win"))
            } catch (_: Exception) {
                android.widget.Toast.makeText(activity, "Couldn't open sharing. Please save the picture instead.", android.widget.Toast.LENGTH_LONG).show()
            }
        }
    }
}
