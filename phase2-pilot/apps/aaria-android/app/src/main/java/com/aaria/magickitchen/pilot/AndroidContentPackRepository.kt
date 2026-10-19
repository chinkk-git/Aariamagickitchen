package com.aaria.magickitchen.pilot

import android.content.Context
import android.util.Base64
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.security.KeyFactory
import java.security.PublicKey
import java.security.spec.X509EncodedKeySpec
import java.util.concurrent.ConcurrentHashMap

internal fun <T> activateAfterParentConfirmation(approved: Boolean, activate: () -> T): T {
    if (!approved) throw SecurityException("Parent or guardian did not approve this content update")
    return activate()
}

/** App-private storage and monotonic activation state for verified content packs. */
class AndroidContentPackRepository(
    context: Context,
    private val publisherKey: PublicKey? = loadPublisherKey(context),
    private val publisherKeyId: String? = loadPublisherKeyId(context)
) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("verified-content-packs", Context.MODE_PRIVATE)
    private val root = File(appContext.filesDir, "verified-content")
    private val active = File(root, "active")
    private val previous = File(root, "previous")
    private val awaitingParentApproval = ConcurrentHashMap.newKeySet<String>()

    fun installBase64(encoded: String, parentApproval: (Int, Int) -> Boolean, activationAllowed: () -> Boolean): JSONObject {
        val pack = synchronized(this) {
            require(encoded.length <= MAX_BASE64_CHARS) { "Content pack is too large" }
            val key = publisherKey ?: throw IllegalStateException("Trusted content publisher key is not provisioned")
            val keyId = publisherKeyId?.takeIf { it.isNotBlank() } ?: throw IllegalStateException("Trusted content publisher key ID is not provisioned")
            recoverInterruptedActivation()
            val bytes = Base64.decode(encoded, Base64.DEFAULT)
            val lastVersion = prefs.getInt(KEY_VERSION, 0)
            val stage = File(root, "staged-${System.nanoTime()}")
            SignedContentPackVerifier.verifyAndStage(bytes, stage, key, keyId, BuildConfig.VERSION_CODE, lastVersion)
                .also { awaitingParentApproval.add(it.stagingDirectory.canonicalPath) }
        }
        try {
            // Prompt only after the signed package has been fully verified. Do not hold the
            // activation monitor while a parent responds; catalog reads remain available.
            return activateAfterParentConfirmation(parentApproval(pack.version, pack.files.size)) {
                synchronized(this) {
                recoverInterruptedActivation()
                check(pack.version > prefs.getInt(KEY_VERSION, 0)) { "Content replay or concurrent activation rejected" }
                check(activationAllowed()) { "Parent approval expired because the app left the foreground" }
                val stageRoot = root.canonicalFile
                val stage = pack.stagingDirectory.canonicalFile
                check(stage.parentFile == stageRoot && stage.name.startsWith("staged-") && stage.isDirectory) {
                    "Verified staging data is no longer available"
                }
                check(prefs.edit().putInt(KEY_PENDING, pack.version).commit()) { "Could not persist activation recovery marker" }
                try {
                    SignedContentPackVerifier.activate(pack, active, previous) { version ->
                        check(prefs.edit().putInt(KEY_VERSION, version).remove(KEY_PENDING).commit()) { "Could not persist accepted content version" }
                    }
                } catch (error: Exception) {
                    // Keep KEY_PENDING for startup recovery if the swap reached disk.
                    throw error
                }
                JSONObject().put("contentVersion", pack.version).put("files", pack.files.size)
                }
            }
        } finally {
            awaitingParentApproval.remove(pack.stagingDirectory.canonicalPath)
            if (pack.stagingDirectory.exists()) pack.stagingDirectory.deleteRecursively()
        }
    }

    @Synchronized
    fun recoverInterruptedActivation() {
        val pending = prefs.getInt(KEY_PENDING, -1)
        if (pending < 0) {
            discardAbandonedStages()
            return
        }
        val activeVersion = active.takeIf { it.isDirectory }?.resolve("pack-version.txt")?.takeIf { it.isFile }?.readText()?.trim()?.toIntOrNull()
        if (activeVersion == pending) {
            check(prefs.edit().putInt(KEY_VERSION, pending).remove(KEY_PENDING).commit())
            if (previous.exists()) previous.deleteRecursively()
        } else {
            if (previous.exists()) {
                if (active.exists()) check(active.deleteRecursively()) { "Could not remove incomplete active content" }
                check(previous.renameTo(active)) { "Could not restore previous verified content; recovery remains pending" }
            }
            check(prefs.edit().remove(KEY_PENDING).commit()) { "Could not clear content recovery marker" }
        }
        discardAbandonedStages()
    }

    private fun discardAbandonedStages() {
        root.listFiles()?.filter { it.name.startsWith("staged-") && it.canonicalPath !in awaitingParentApproval }?.forEach { stage ->
            // Cleanup is best effort: inability to reclaim stale temporary space must not
            // invalidate or hide the last known-good active content.
            runCatching { stage.deleteRecursively() }
        }
    }

    @Synchronized
    fun activeContentDirectory(): File? = active.takeIf { it.isDirectory }

    @Synchronized
    fun openContentAsset(appAssetPath: String): InputStream? = runCatching {
        recoverInterruptedActivation()
        if (!appAssetPath.startsWith("content/")) return null
        val contentRoot = File(active, "content").canonicalFile
        val file = File(contentRoot, appAssetPath.removePrefix("content/")).canonicalFile
        if (!file.toPath().startsWith(contentRoot.toPath()) || !file.isFile || file.length() > MAX_ASSET_BYTES) return null
        FileInputStream(file)
    }.getOrNull()

    fun readRecipeCatalog(): String = runCatching {
        val input = openContentAsset("content/catalog.json") ?: return ""
        input.use { stream -> stream.readBytes().takeIf { it.size <= MAX_CATALOG_BYTES }?.toString(Charsets.UTF_8) ?: "" }
    }.getOrDefault("")

    companion object {
        private const val KEY_VERSION = "last_accepted_content_version"
        private const val KEY_PENDING = "pending_content_activation_version"
        private const val MAX_BASE64_CHARS = 140_000_000
        private const val MAX_ASSET_BYTES = 12L * 1024 * 1024
        private const val MAX_CATALOG_BYTES = 5 * 1024 * 1024
        private fun loadPublisherKey(context: Context): PublicKey? = runCatching {
            val bytes = context.assets.open("content-pack-publisher.x509").use { it.readBytes() }
            KeyFactory.getInstance("RSA").generatePublic(X509EncodedKeySpec(bytes))
        }.getOrNull()

        private fun loadPublisherKeyId(context: Context): String? = runCatching {
            context.assets.open("content-pack-publisher.keyid").bufferedReader().use { it.readText().trim() }
        }.getOrNull()
    }
}
