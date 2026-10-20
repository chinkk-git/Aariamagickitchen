package com.aaria.magickitchen.pilot

import android.app.Activity
import android.app.AlertDialog
import android.app.KeyguardManager
import android.content.ClipData
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.Uri
import android.os.Bundle
import android.os.Build
import android.os.Looper
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.window.OnBackInvokedCallback
import android.window.OnBackInvokedDispatcher
import java.io.ByteArrayInputStream
import java.io.File
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

private fun localErrorResponse(statusCode: Int, reasonPhrase: String): WebResourceResponse =
    WebResourceResponse(
        "text/plain",
        "UTF-8",
        statusCode,
        reasonPhrase,
        mapOf("Cache-Control" to "no-store"),
        ByteArrayInputStream(ByteArray(0))
    )

internal fun resolveChooserResult(
    cameraCaptureUri: Uri?,
    cameraCaptureFile: File?,
    resultCode: Int,
    resultOkCode: Int,
    pickerResult: Array<Uri>?
): Array<Uri>? {
    if (cameraCaptureUri == null) return pickerResult
    return if (resultCode == resultOkCode && cameraCaptureFile?.isFile == true && cameraCaptureFile.length() > 0L) {
        arrayOf(cameraCaptureUri)
    } else {
        // A camera-only request must not fall through to a URI supplied by a picker or
        // by a camera app when capture was canceled or did not produce the requested file.
        null
    }
}

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val approvalLifecycleLock = Any()
    @Volatile internal var isForegroundForApproval: Boolean = false
        private set
    private val parentCredentialPromptPending = AtomicBoolean(false)
    private val contentPacks by lazy { AndroidContentPackRepository(this) }
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var pendingCaptureUri: Uri? = null
    private var pendingCaptureFile: File? = null
    private val fileChooserRequest = 4312
    private val parentShareRequest = 4313
    private val parentUpdateRequest = 4314
    private data class PendingShare(val bytes: ByteArray, val mimeType: String, val title: String)
    private data class PendingUpdateApproval(
        val completed: CountDownLatch = CountDownLatch(1),
        val dialogApproved: AtomicBoolean = AtomicBoolean(false),
        val credentialApproved: AtomicBoolean = AtomicBoolean(false)
    )
    private val pendingParentShare = AtomicReference<PendingShare?>(null)
    private val pendingParentUpdate = AtomicReference<PendingUpdateApproval?>(null)
    private var backInvokedCallback: OnBackInvokedCallback? = null

    internal fun requestParentApprovedShare(bytes: ByteArray, mimeType: String, title: String): Boolean {
        if (Looper.myLooper() == Looper.getMainLooper() || bytes.isEmpty() ||
            bytes.size > 15 * 1024 * 1024 || mimeType !in setOf("image/png", "image/jpeg") ||
            title.length > NativeBridgeInputPolicy.MAX_SHARED_TITLE_CHARS
        ) return false
        if (!parentCredentialPromptPending.compareAndSet(false, true)) return false

        val keyguard = (getSystemService(KEYGUARD_SERVICE) as? KeyguardManager) ?: run {
            parentCredentialPromptPending.set(false)
            return false
        }
        if (!keyguard.isDeviceSecure) {
            runOnUiThread {
                android.widget.Toast.makeText(
                    this,
                    "Ask a parent to set a device screen lock before sharing photos.",
                    android.widget.Toast.LENGTH_LONG
                ).show()
            }
            parentCredentialPromptPending.set(false)
            return false
        }
        if (!ParentShareAuthorizationPolicy.canRequest(
                hasSecureDeviceCredential = keyguard.isDeviceSecure,
                activityForeground = isForegroundForApproval,
                activityAlive = !isFinishing && !isDestroyed,
                requestAlreadyPending = pendingParentShare.get() != null || pendingParentUpdate.get() != null
            )
        ) {
            parentCredentialPromptPending.set(false)
            return false
        }
        val credentialPrompt = try {
            keyguard.createConfirmDeviceCredentialIntent(
                "Parent or guardian approval",
                "A parent or guardian must confirm before this photo can be shared."
            )
        } catch (_: Exception) {
            null
        } ?: run {
            parentCredentialPromptPending.set(false)
            return false
        }

        val pending = PendingShare(bytes.copyOf(), mimeType, title)
        if (!pendingParentShare.compareAndSet(null, pending)) {
            parentCredentialPromptPending.set(false)
            return false
        }
        val promptStarted = AtomicBoolean(false)
        val promptStartCompleted = CountDownLatch(1)
        runOnUiThread {
            if (isFinishing || isDestroyed || !isForegroundForApproval) {
                pendingParentShare.compareAndSet(pending, null)
                promptStartCompleted.countDown()
                return@runOnUiThread
            }
            try {
                startActivityForResult(credentialPrompt, parentShareRequest)
                promptStarted.set(true)
            } catch (_: Exception) {
                pendingParentShare.compareAndSet(pending, null)
            } finally {
                promptStartCompleted.countDown()
            }
        }
        val started = try {
            promptStartCompleted.await(3, TimeUnit.SECONDS) && promptStarted.get()
        } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
            false
        }
        if (!started) {
            pendingParentShare.compareAndSet(pending, null)
            parentCredentialPromptPending.set(false)
        }
        return started
    }

    internal fun confirmParentContentUpdate(version: Int, fileCount: Int): Boolean {
        // A WebView JavaScript bridge call runs off the UI thread. Fail closed if that changes.
        if (Looper.myLooper() == Looper.getMainLooper()) return false
        val keyguard = getSystemService(KEYGUARD_SERVICE) as? KeyguardManager ?: return false
        if (!keyguard.isDeviceSecure || !isForegroundForApproval || isFinishing || isDestroyed) return false
        val credentialPrompt = try {
            keyguard.createConfirmDeviceCredentialIntent(
                "Parent or guardian approval",
                "A parent or guardian must unlock this device to approve the verified content update."
            )
        } catch (_: Exception) {
            null
        } ?: return false
        if (!parentCredentialPromptPending.compareAndSet(false, true)) return false
        val pending = PendingUpdateApproval()
        if (!pendingParentUpdate.compareAndSet(null, pending)) {
            parentCredentialPromptPending.set(false)
            return false
        }
        val dialog = AtomicReference<AlertDialog?>()
        val promptStarted = AtomicBoolean(false)
        runOnUiThread {
            if (isFinishing || isDestroyed || !isForegroundForApproval) {
                pending.completed.countDown()
            } else {
                dialog.set(
                    AlertDialog.Builder(this)
                        .setTitle("Parent or guardian approval")
                        .setMessage("Review verified kitchen content update $version containing $fileCount items. A device credential is required to continue.")
                        .setPositiveButton("Continue") { _, _ ->
                            try {
                                if (isFinishing || isDestroyed || !isForegroundForApproval) {
                                    pending.completed.countDown()
                                } else {
                                    pending.dialogApproved.set(true)
                                    startActivityForResult(credentialPrompt, parentUpdateRequest)
                                    promptStarted.set(true)
                                }
                            } catch (_: Exception) {
                                pending.completed.countDown()
                            }
                        }
                        .setNegativeButton("Cancel") { _, _ -> pending.completed.countDown() }
                        .setOnCancelListener { pending.completed.countDown() }
                        .create()
                        .also { it.show() }
                )
            }
        }
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(60)
        while (pending.completed.count > 0 && System.nanoTime() < deadline) {
            if (isFinishing || isDestroyed || (!promptStarted.get() && !isForegroundForApproval)) {
                runOnUiThread { dialog.getAndSet(null)?.dismiss() }
                pending.completed.countDown()
                break
            }
            val signaled = try {
                pending.completed.await(250, TimeUnit.MILLISECONDS)
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
                pending.completed.countDown()
                false
            }
            if (signaled || Thread.currentThread().isInterrupted) break
        }
        if (pending.completed.count > 0) {
            runOnUiThread { dialog.getAndSet(null)?.dismiss() }
            pending.completed.countDown()
        }
        val approved = ParentUpdateAuthorizationPolicy.canActivate(
            dialogApproved = pending.dialogApproved.get(),
            credentialApproved = pending.credentialApproved.get(),
            activityForeground = isForegroundForApproval,
            activityAlive = !isFinishing && !isDestroyed
        )
        pendingParentUpdate.compareAndSet(pending, null)
        parentCredentialPromptPending.set(false)
        return approved
    }

    private fun shareParentApprovedPhoto(share: PendingShare) {
        try {
            val directory = File(cacheDir, "shared-posts").apply { mkdirs() }
            val extension = if (share.mimeType == "image/png") ".png" else ".jpg"
            val name = UUID.randomUUID().toString() + extension
            File(directory, name).writeBytes(share.bytes)
            val uri = Uri.parse("content://$packageName.share/post/$name")
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = share.mimeType
                putExtra(Intent.EXTRA_STREAM, uri)
                if (share.title.isNotBlank()) putExtra(Intent.EXTRA_TEXT, share.title)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(intent, "Share your kitchen win"))
        } catch (_: Exception) {
            android.widget.Toast.makeText(
                this,
                "Could not open sharing. Please save the picture instead.",
                android.widget.Toast.LENGTH_LONG
            ).show()
        }
    }

    internal fun <T> withApprovalForeground(block: () -> T): T = synchronized(approvalLifecycleLock) {
        check(isForegroundForApproval && !isFinishing && !isDestroyed) {
            "Parent approval expired because the app left the foreground"
        }
        block()
    }

    override fun onResume() {
        super.onResume()
        synchronized(approvalLifecycleLock) { isForegroundForApproval = true }
    }

    override fun onPause() {
        synchronized(approvalLifecycleLock) { isForegroundForApproval = false }
        super.onPause()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WebView.setWebContentsDebuggingEnabled((applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0)
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
                    if (fileChooserParams.isCaptureEnabled) {
                        // Camera-only requests must never fall through to a photo picker or gallery.
                        fileChooserCallback?.onReceiveValue(null)
                        fileChooserCallback = null
                        return true
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
                    if (!AppAssetsUrlPolicy.isAppAssetsHost(uri.host)) return null
                    if (!AppAssetsUrlPolicy.isTrustedOrigin(uri.scheme, uri.host, uri.port, uri.userInfo, uri.encodedAuthority)) {
                        return localErrorResponse(403, "Forbidden")
                    }

                    val assetPath = when (val result = AppAssetsUrlPolicy.classifyAssetPath(uri.path)) {
                        is AssetPathResult.Valid -> result.path
                        AssetPathResult.NotFound -> return localErrorResponse(404, "Not Found")
                        AssetPathResult.Forbidden -> return localErrorResponse(403, "Forbidden")
                    }
                    if (assetPath.startsWith("content/")) {
                        val stream = contentPacks.openContentAsset(assetPath) ?: return localErrorResponse(404, "Not Found")
                        val contentType = when {
                            assetPath.endsWith(".json", ignoreCase = true) -> "application/json"
                            assetPath.endsWith(".webp", ignoreCase = true) -> "image/webp"
                            assetPath.endsWith(".png", ignoreCase = true) -> "image/png"
                            assetPath.endsWith(".jpg", ignoreCase = true) || assetPath.endsWith(".jpeg", ignoreCase = true) -> "image/jpeg"
                            else -> return localErrorResponse(403, "Forbidden")
                        }
                        return WebResourceResponse(contentType, "UTF-8", 200, "OK", mapOf("Cache-Control" to "no-store", "X-Content-Type-Options" to "nosniff"), stream)
                    }
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
                        localErrorResponse(404, "Not Found")
                    }
                }

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    // JavaScript interfaces are visible to every frame in Android WebView.
                    // The app only uses the main document, so block subframes before URL routing.
                    if (AppAssetsUrlPolicy.shouldBlockSubframeNavigation(request.isForMainFrame)) return true
                    val uri = request.url
                    if (AppAssetsUrlPolicy.isAppAssetsHost(uri.host)) {
                        return !AppAssetsUrlPolicy.isTrustedOrigin(uri.scheme, uri.host, uri.port, uri.userInfo, uri.encodedAuthority)
                    }
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backInvokedCallback = OnBackInvokedCallback { handleBackNavigation() }.also { callback ->
                onBackInvokedDispatcher.registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    callback
                )
            }
        }
    }

    private fun handleBackNavigation() {
        if (webView.canGoBack()) webView.goBack() else finish()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == parentUpdateRequest) {
            val pending = pendingParentUpdate.getAndSet(null)
            pending?.credentialApproved?.set(
                ParentUpdateAuthorizationPolicy.canApprove(
                    credentialResult = resultCode,
                    successResult = RESULT_OK,
                    parentDialogApproved = pending.dialogApproved.get(),
                    activityAlive = !isFinishing && !isDestroyed
                )
            )
            pending?.completed?.countDown()
            return
        }
        if (requestCode == parentShareRequest) {
            val pending = pendingParentShare.getAndSet(null)
            if (ParentShareAuthorizationPolicy.canDispatch(
                    credentialResult = resultCode,
                    successResult = RESULT_OK,
                    hasPendingPhoto = pending != null,
                    activityAlive = !isFinishing && !isDestroyed
                )
            ) {
                pending?.let(::shareParentApprovedPhoto)
            } else if (pending != null && !isFinishing && !isDestroyed) {
                android.widget.Toast.makeText(this, "No photo was shared.", android.widget.Toast.LENGTH_SHORT).show()
            }
            parentCredentialPromptPending.set(false)
            return
        }
        if (requestCode == fileChooserRequest) {
            val captureUri = pendingCaptureUri
            val captureFile = pendingCaptureFile
            val pickerResult = if (captureUri == null) WebChromeClient.FileChooserParams.parseResult(resultCode, data) else null
            val result = resolveChooserResult(captureUri, captureFile, resultCode, RESULT_OK, pickerResult)
            if (captureUri != null && result == null) captureFile?.delete()
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
        pendingParentShare.getAndSet(null)
        pendingParentUpdate.getAndSet(null)?.completed?.countDown()
        parentCredentialPromptPending.set(false)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backInvokedCallback?.let { onBackInvokedDispatcher.unregisterOnBackInvokedCallback(it) }
            backInvokedCallback = null
        }
        webView.destroy()
        super.onDestroy()
    }

    @Deprecated("Android routes back navigation through the WebView before exiting the pilot.")
    override fun onBackPressed() {
        handleBackNavigation()
    }
}

class ShareBridge(private val activity: Activity) {
    private val profileStore by lazy { ProfileStore(activity) }
    private val contentPackRepository by lazy { AndroidContentPackRepository(activity) }

    private fun <T> withApprovalForeground(block: () -> T): T =
        (activity as? MainActivity)?.withApprovalForeground(block)
            ?: throw SecurityException("Parent approval requires the kitchen activity")

    private fun isApprovalActivityForeground(): Boolean =
        activity is MainActivity && activity.isForegroundForApproval

    private fun confirmParentContentUpdate(version: Int, fileCount: Int): Boolean =
        (activity as? MainActivity)?.confirmParentContentUpdate(version, fileCount) ?: false

    @JavascriptInterface
    fun installVerifiedContentPack(base64Zip: String): String = bridgeResult {
        contentPackRepository.installBase64(
            base64Zip,
            { version, fileCount -> confirmParentContentUpdate(version, fileCount) },
            { isApprovalActivityForeground() && !activity.isFinishing && !activity.isDestroyed },
            { activate -> withApprovalForeground(activate) }
        ).toString()
    }

    @JavascriptInterface
    fun getActiveRecipeCatalog(): String = contentPackRepository.readRecipeCatalog()

    @JavascriptInterface
    fun initializeProfiles(legacySnapshot: String): String = bridgeResult {
        profileStore.initialize(legacySnapshot).toString()
    }

    @JavascriptInterface
    fun createProfile(name: String, chefId: String, snapshot: String): String = bridgeResult {
        profileStore.createProfile(name, chefId, snapshot).toString()
    }

    @JavascriptInterface
    fun activateProfile(profileId: String): String = bridgeResult {
        profileStore.activateProfile(profileId).toString()
    }

    @JavascriptInterface
    fun saveProfileSnapshot(profileId: String, snapshot: String): Boolean =
        runCatching { profileStore.saveSnapshot(profileId, snapshot) }.getOrDefault(false)

    @JavascriptInterface
    fun chooseProfileChef(profileId: String, chefId: String): Boolean =
        runCatching { profileStore.chooseChef(profileId, chefId) }.getOrDefault(false)

    private inline fun bridgeResult(block: () -> String): String = try {
        block()
    } catch (error: Exception) {
        "{\"error\":\"${error.javaClass.simpleName}\"}"
    }

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
    fun sharePost(dataUrl: String, title: String): Boolean {
        if (!NativeBridgeInputPolicy.isSharePostWithinLimits(dataUrl, title)) return false
        val prefix = when {
            dataUrl.startsWith("data:image/png;base64,") -> "data:image/png;base64,"
            dataUrl.startsWith("data:image/jpeg;base64,") -> "data:image/jpeg;base64,"
            else -> return false
        }
        val mimeType = if (prefix.contains("png")) "image/png" else "image/jpeg"
        val bytes = try {
            android.util.Base64.decode(dataUrl.removePrefix(prefix), android.util.Base64.DEFAULT)
        } catch (_: IllegalArgumentException) {
            return false
        }
        if (bytes.isEmpty() || bytes.size > 15 * 1024 * 1024) return false
        val mainActivity = activity as? MainActivity ?: return false
        return mainActivity.requestParentApprovedShare(bytes, mimeType, title)
    }
}
