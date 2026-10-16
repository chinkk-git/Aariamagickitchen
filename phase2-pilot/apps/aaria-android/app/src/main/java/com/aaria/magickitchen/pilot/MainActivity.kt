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
                    if (uri.scheme == "https" && uri.host == "appassets.androidplatform.net") return false
                    if (uri.scheme == "https" || uri.scheme == "http" || uri.scheme == "whatsapp") {
                        return try {
                            startActivity(Intent(Intent.ACTION_VIEW, uri))
                            true
                        } catch (_: Exception) {
                            android.widget.Toast.makeText(this@MainActivity, "Could not open that link.", android.widget.Toast.LENGTH_LONG).show()
                            true
                        }
                    }
                    return true
                }

                override fun onPageFinished(view: WebView, url: String?) {
                    super.onPageFinished(view, url)
                    if (url?.startsWith("https://appassets.androidplatform.net/") == true) {
                        view.evaluateJavascript(SHARE_POLYFILL, null)
                    }
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

    private companion object {
        val SHARE_POLYFILL = """
            (function () {
              const bridge = window.AariaNative;
              if (!bridge || window.__aariaShareReady) return;
              window.__aariaShareReady = true;
              const readAsDataUrl = file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(reader.error || new Error('Could not read image'));
                reader.readAsDataURL(file);
              });
              const share = async data => {
                const title = String(data && data.title || '');
                const body = String(data && (data.text || data.url) || '');
                if (data && data.files && data.files.length) {
                  const file = data.files[0];
                  const image = await readAsDataUrl(file);
                  bridge.sharePost(image, [title, body].filter(Boolean).join('\\n'));
                  return;
                }
                bridge.shareText(title, body);
              };
              try {
                Object.defineProperty(navigator, 'canShare', {
                  configurable: true,
                  value: data => !data || !data.files || (data.files.length <= 1 && data.files.every(file => /^image\\/(png|jpeg)$/.test(file.type)))
                });
                Object.defineProperty(navigator, 'share', { configurable: true, value: share });
              } catch (_) {}
            })();
        """.trimIndent()
    }
}

class ShareBridge(private val activity: Activity) {
    @JavascriptInterface
    fun shareText(title: String, message: String) {
        if (message.length > 12000 || title.length > 240) return
        activity.runOnUiThread {
            try {
                val share = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, title)
                    putExtra(Intent.EXTRA_TEXT, message)
                }
                activity.startActivity(Intent.createChooser(share, "Share from Aaria's Magical Kitchen"))
            } catch (_: Exception) {
                android.widget.Toast.makeText(activity, "Could not open sharing.", android.widget.Toast.LENGTH_LONG).show()
            }
        }
    }

    @JavascriptInterface
    fun sharePost(dataUrl: String, title: String) {
        val prefix = when {
            dataUrl.startsWith("data:image/png;base64,") -> "data:image/png;base64,"
            dataUrl.startsWith("data:image/jpeg;base64,") -> "data:image/jpeg;base64,"
            else -> return
        }
        val mimeType = if (prefix.contains("png")) "image/png" else "image/jpeg"
        val extension = if (mimeType == "image/png") ".png" else ".jpg"
        val bytes = try {
            android.util.Base64.decode(dataUrl.removePrefix(prefix), android.util.Base64.DEFAULT)
        } catch (_: IllegalArgumentException) {
            return
        }
        if (bytes.isEmpty() || bytes.size > 15 * 1024 * 1024) return
        activity.runOnUiThread {
            try {
                val directory = java.io.File(activity.cacheDir, "shared-posts").apply { mkdirs() }
                val name = java.util.UUID.randomUUID().toString() + extension
                java.io.File(directory, name).writeBytes(bytes)
                val uri = Uri.parse("content://${activity.packageName}.share/post/$name")
                val share = Intent(Intent.ACTION_SEND).apply {
                    type = mimeType
                    putExtra(Intent.EXTRA_STREAM, uri)
                    if (title.isNotBlank()) putExtra(Intent.EXTRA_TEXT, title)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                activity.startActivity(Intent.createChooser(share, "Share your kitchen win"))
            } catch (_: Exception) {
                android.widget.Toast.makeText(activity, "Could not open sharing. Please save the picture instead.", android.widget.Toast.LENGTH_LONG).show()
            }
        }
    }
}