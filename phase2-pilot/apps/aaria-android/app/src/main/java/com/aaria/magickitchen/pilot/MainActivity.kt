package com.aaria.magickitchen.pilot

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.File
import java.util.UUID

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var pendingCaptureUri: Uri? = null
    private var pendingCaptureFile: File? = null
    private val fileChooserRequest = 4312

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.allowFileAccessFromFileURLs = false
            settings.allowUniversalAccessFromFileURLs = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.safeBrowsingEnabled = true
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
                    pendingCaptureFile?.delete()
                    pendingCaptureFile = null
                    pendingCaptureUri = null
                    fileChooserCallback = filePathCallback

                    if (fileChooserParams.isCaptureEnabled) {
                        try {
                            val directory = File(cacheDir, "shared-posts").apply { mkdirs() }
                            val file = File(directory, UUID.randomUUID().toString() + ".jpg")
                            val uri = Uri.parse("content://$packageName.share/capture/${file.name}")
                            val camera = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                                putExtra(MediaStore.EXTRA_OUTPUT, uri)
                                clipData = ClipData.newRawUri("Aaria dish photo", uri)
                                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                            }
                            if (camera.resolveActivity(packageManager) != null) {
                                pendingCaptureFile = file
                                pendingCaptureUri = uri
                                packageManager.queryIntentActivities(camera, 0).forEach {
                                    grantUriPermission(
                                        it.activityInfo.packageName,
                                        uri,
                                        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                                    )
                                }
                                startActivityForResult(camera, fileChooserRequest)
                                return true
                            }
                        } catch (_: Exception) {
                            pendingCaptureFile?.delete()
                            pendingCaptureFile = null
                            pendingCaptureUri = null
                        }
                    }
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
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                    val uri = request.url
                    if (uri.host != "appassets.androidplatform.net") return null
                    val assetPath = uri.path?.removePrefix("/")?.takeIf { it.isNotBlank() } ?: return null
                    val mimeType = when {
                        assetPath.endsWith(".html", ignoreCase = true) -> "text/html"
                        assetPath.endsWith(".js", ignoreCase = true) -> "application/javascript"
                        assetPath.endsWith(".css", ignoreCase = true) -> "text/css"
                        assetPath.endsWith(".png", ignoreCase = true) -> "image/png"
                        assetPath.endsWith(".webp", ignoreCase = true) -> "image/webp"
                        assetPath.endsWith(".jpg", ignoreCase = true) || assetPath.endsWith(".jpeg", ignoreCase = true) -> "image/jpeg"
                        else -> "application/octet-stream"
                    }
                    return try {
                        WebResourceResponse(mimeType, "UTF-8", assets.open(assetPath))
                    } catch (_: Exception) {
                        null
                    }
                }

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
                    // Load the production index.html as-is. Android only supplies the native file chooser.
                }
            }
            loadUrl("https://appassets.androidplatform.net/index.html")
        }
        setContentView(webView)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == fileChooserRequest) {
            val captureUri = pendingCaptureUri
            val captureFile = pendingCaptureFile
            val result = if (resultCode == RESULT_OK && captureUri != null && captureFile?.isFile == true && captureFile.length() > 0L) {
                arrayOf(captureUri)
            } else {
                if (captureFile != null) captureFile.delete()
                WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            }
            fileChooserCallback?.onReceiveValue(result)
            fileChooserCallback = null
            pendingCaptureUri = null
            pendingCaptureFile = null
            return
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        pendingCaptureFile?.delete()
        fileChooserCallback = null
        pendingCaptureFile = null
        pendingCaptureUri = null
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
                val directory = File(activity.cacheDir, "shared-posts").apply { mkdirs() }
                val name = UUID.randomUUID().toString() + extension
                File(directory, name).writeBytes(bytes)
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