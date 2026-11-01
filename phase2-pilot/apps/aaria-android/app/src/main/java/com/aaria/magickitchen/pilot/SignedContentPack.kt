package com.aaria.magickitchen.pilot

import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.PublicKey
import java.security.Signature
import java.security.MessageDigest
import java.util.Base64
import java.util.Locale
import java.util.zip.ZipInputStream

data class VerifiedContentPack(val version: Int, val stagingDirectory: File, val files: List<String>)

/** Verifies signed declarative data packs before they can replace app-private content. */
object SignedContentPackVerifier {
    private const val MAX_ARCHIVE_BYTES = 100L * 1024 * 1024
    private const val MAX_EXPANDED_BYTES = 100L * 1024 * 1024
    private const val MAX_ENTRY_BYTES = 12L * 1024 * 1024
    private const val MAX_ENTRIES = 2500
    private val allowedTypes = mapOf(
        "application/json" to setOf(".json"),
        "image/webp" to setOf(".webp"),
        "image/png" to setOf(".png"),
        "image/jpeg" to setOf(".jpg", ".jpeg")
    )

    /** The signed bytes are the exact UTF-8 bytes of the manifest's base64 `payload`. */
    fun verifyAndStage(
        archive: ByteArray,
        stagingDirectory: File,
        publisherKey: PublicKey,
        trustedKeyId: String,
        appVersion: Int,
        lastAcceptedVersion: Int,
        nowEpochSeconds: Long = System.currentTimeMillis() / 1000
    ): VerifiedContentPack {
        require(archive.isNotEmpty() && archive.size.toLong() <= MAX_ARCHIVE_BYTES) { "Pack archive size is invalid" }
        val zipFiles = readZip(archive)
        val wrapperBytes = zipFiles.remove("manifest.json") ?: throw IllegalArgumentException("Missing signed manifest")
        val wrapper = JSONObject(wrapperBytes.toString(Charsets.UTF_8))
        require(wrapper.keys().asSequence().toSet() == setOf("keyId", "payload", "signature")) { "Unexpected signed-manifest fields" }
        require(wrapper.optString("keyId") == trustedKeyId && trustedKeyId.isNotBlank()) { "Untrusted publisher key" }
        val payload = Base64.getDecoder().decode(wrapper.getString("payload"))
        val signatureBytes = Base64.getDecoder().decode(wrapper.getString("signature"))
        val verifier = Signature.getInstance("SHA256withRSA")
        verifier.initVerify(publisherKey)
        verifier.update(payload)
        require(verifier.verify(signatureBytes)) { "Manifest signature is invalid" }

        val manifest = JSONObject(payload.toString(Charsets.UTF_8))
        require(manifest.keys().asSequence().toSet() == setOf("schemaVersion", "contentVersion", "minAppVersion", "maxAppVersion", "expiresAt", "entries")) { "Unexpected payload fields" }
        require(manifest.getInt("schemaVersion") == 1) { "Unsupported content schema" }
        val version = manifest.getInt("contentVersion")
        require(version > lastAcceptedVersion) { "Content rollback or replay rejected" }
        require(manifest.getInt("minAppVersion") <= appVersion && manifest.getInt("maxAppVersion") >= appVersion) { "App version is incompatible" }
        require(manifest.getLong("expiresAt") >= nowEpochSeconds) { "Content manifest expired" }

        val entries = manifest.getJSONArray("entries")
        require(entries.length() in 1..MAX_ENTRIES) { "Manifest entry count is invalid" }
        val declared = LinkedHashMap<String, Entry>()
        var totalBytes = 0L
        for (i in 0 until entries.length()) {
            val item = entries.getJSONObject(i)
            require(item.keys().asSequence().toSet() == setOf("path", "mediaType", "bytes", "sha256", "role")) { "Unexpected content entry fields" }
            val path = item.getString("path")
            val type = item.getString("mediaType")
            val bytes = item.getLong("bytes")
            val digest = item.getString("sha256").lowercase(Locale.ROOT)
            val role = item.getString("role")
            validatePath(path)
            require(role in setOf("recipe-data", "artwork", "tour-data")) { "Executable or unknown content role" }
            require(allowedTypes[type]?.any { path.endsWith(it, ignoreCase = true) } == true) { "Disallowed content type" }
            require((role == "artwork") == type.startsWith("image/")) { "Content role does not match its media type" }
            require(bytes in 1..MAX_ENTRY_BYTES && digest.matches(Regex("[0-9a-f]{64}"))) { "Invalid entry metadata" }
            require(declared.put(path, Entry(bytes, digest, type, role)) == null) { "Duplicate manifest path" }
            totalBytes += bytes
            require(totalBytes <= MAX_EXPANDED_BYTES) { "Content pack exceeds expanded size limit" }
        }
        require(zipFiles.keys == declared.keys) { "Archive contains undeclared or missing content" }

        val normalizedStage = stagingDirectory.canonicalFile
        if (normalizedStage.exists()) normalizedStage.deleteRecursively()
        require(normalizedStage.mkdirs() || normalizedStage.isDirectory) { "Could not create staging directory" }
        try {
            for ((path, entry) in declared) {
                val bytes = zipFiles.getValue(path)
                require(bytes.size.toLong() == entry.bytes) { "Content size mismatch" }
                require(sha256(bytes) == entry.sha256) { "Content hash mismatch" }
                validateBytes(bytes, entry.mediaType)
                val out = File(normalizedStage, path).canonicalFile
                require(out.toPath().startsWith(normalizedStage.toPath())) { "Content path escapes staging directory" }
                out.parentFile?.let { require(it.mkdirs() || it.isDirectory) }
                out.writeBytes(bytes)
            }
            File(normalizedStage, "pack-version.txt").writeText(version.toString(), Charsets.UTF_8)
            return VerifiedContentPack(version, normalizedStage, declared.keys.toList())
        } catch (error: Exception) {
            normalizedStage.deleteRecursively()
            throw error
        }
    }

    /** Atomic directory swap; callers persist the monotonic version only after the swap succeeds. */
    fun activate(pack: VerifiedContentPack, activeDirectory: File, previousDirectory: File, commitVersion: (Int) -> Unit) {
        val active = activeDirectory.canonicalFile
        val previous = previousDirectory.canonicalFile
        val stage = pack.stagingDirectory.canonicalFile
        require(stage.isDirectory && stage.parentFile == active.parentFile) { "Staged content must share the app-private filesystem" }
        if (previous.exists()) require(previous.deleteRecursively()) { "Could not clear previous content backup" }
        val hadActive = active.exists()
        if (hadActive) require(active.renameTo(previous)) { "Could not preserve active content" }
        try {
            require(stage.renameTo(active)) { "Could not activate staged content" }
            commitVersion(pack.version)
            if (previous.exists()) previous.deleteRecursively()
        } catch (error: Exception) {
            if (active.exists()) active.deleteRecursively()
            if (hadActive && previous.exists()) previous.renameTo(active)
            throw error
        }
    }

    private data class Entry(val bytes: Long, val sha256: String, val mediaType: String, val role: String)

    private fun readZip(archive: ByteArray): MutableMap<String, ByteArray> {
        val result = LinkedHashMap<String, ByteArray>()
        var total = 0L
        ZipInputStream(ByteArrayInputStream(archive)).use { zip ->
            while (true) {
                val entry = zip.nextEntry ?: break
                require(result.size < MAX_ENTRIES + 1) { "Too many archive entries" }
                require(!entry.isDirectory) { "Directory entries are not permitted" }
                validatePath(entry.name, allowManifest = true)
                val out = ByteArrayOutputStream()
                val buffer = ByteArray(8192)
                var count = 0L
                while (true) {
                    val n = zip.read(buffer)
                    if (n < 0) break
                    count += n
                    total += n
                    require(count <= MAX_ENTRY_BYTES && total <= MAX_EXPANDED_BYTES) { "Archive expansion limit exceeded" }
                    out.write(buffer, 0, n)
                }
                require(result.put(entry.name, out.toByteArray()) == null) { "Duplicate archive path" }
                zip.closeEntry()
            }
        }
        return result
    }

    private fun validatePath(path: String, allowManifest: Boolean = false) {
        if (allowManifest && path == "manifest.json") return
        require(path.startsWith("content/") && path.length <= 240) { "Content path is outside the content namespace" }
        require(!path.contains('\\') && !path.startsWith('/') && !path.contains(':')) { "Malformed content path" }
        require(path.split('/').all { it.isNotBlank() && it != "." && it != ".." }) { "Path traversal rejected" }
        val lower = path.lowercase(Locale.ROOT)
        require(!listOf(".html", ".htm", ".js", ".mjs", ".cjs", ".svg", ".xml", ".dex", ".so", ".jar").any { lower.endsWith(it) }) { "Executable or active content rejected" }
    }

    private fun validateBytes(bytes: ByteArray, mediaType: String) {
        when (mediaType) {
            "application/json" -> {
                val tokener = JSONTokener(bytes.toString(Charsets.UTF_8))
                val value = tokener.nextValue()
                require(value is JSONObject || value is JSONArray) { "Content JSON must be an object or array" }
                require(tokener.nextClean() == '\u0000') { "Content JSON has trailing data" }
            }
            "image/png" -> require(bytes.size >= 8 && bytes.copyOfRange(0, 8).contentEquals(byteArrayOf(0x89.toByte(), 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))) { "Invalid PNG header" }
            "image/jpeg" -> require(bytes.size >= 3 && bytes[0] == 0xff.toByte() && bytes[1] == 0xd8.toByte() && bytes[2] == 0xff.toByte()) { "Invalid JPEG header" }
            "image/webp" -> require(bytes.size >= 12 && String(bytes, 0, 4, Charsets.US_ASCII) == "RIFF" && String(bytes, 8, 4, Charsets.US_ASCII) == "WEBP") { "Invalid WebP header" }
            else -> throw IllegalArgumentException("Unsupported content media type")
        }
    }

    private fun sha256(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
}
