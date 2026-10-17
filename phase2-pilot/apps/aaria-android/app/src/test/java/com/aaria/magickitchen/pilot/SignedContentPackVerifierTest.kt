package com.aaria.magickitchen.pilot

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.Signature
import java.util.Base64
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class SignedContentPackVerifierTest {
    private val pair: KeyPair = KeyPairGenerator.getInstance("RSA").run { initialize(2048); generateKeyPair() }

    @Test fun acceptsAuthenticCompatiblePackAndStagesOnlyDeclaredData() {
        val temp = createTempDir(prefix = "pack-valid-")
        val path = "content/recipes.json"
        val data = "[{\"id\":96}]".toByteArray()
        val pack = SignedContentPackVerifier.verifyAndStage(archive(path, data, 4), File(temp, "stage"), pair.public, "test-key", 5, 3, 1000)
        assertEquals(4, pack.version)
        assertEquals(listOf(path), pack.files)
        assertTrue(File(pack.stagingDirectory, path).readBytes().contentEquals(data))
        temp.deleteRecursively()
    }

    @Test fun rejectsReplayExpiredManifestAndAppVersionMismatch() {
        val path = "content/recipes.json"
        val data = "[]".toByteArray()
        rejects("replay") { SignedContentPackVerifier.verifyAndStage(archive(path, data, 4), createTempDir(), pair.public, "test-key", 5, 4, 1000) }
        rejects("expired") { SignedContentPackVerifier.verifyAndStage(archive(path, data, 4, expiresAt = 999), createTempDir(), pair.public, "test-key", 5, 3, 1000) }
        rejects("app range") { SignedContentPackVerifier.verifyAndStage(archive(path, data, 4, minApp = 6), createTempDir(), pair.public, "test-key", 5, 3, 1000) }
    }

    @Test fun rejectsWrongPublisherAndExecutableContent() {
        val path = "content/recipes.json"
        val data = "[]".toByteArray()
        rejects("wrong key") { SignedContentPackVerifier.verifyAndStage(archive(path, data, 4), createTempDir(), KeyPairGenerator.getInstance("RSA").run { initialize(2048); generateKeyPair() }.public, "test-key", 5, 3, 1000) }
        rejects("untrusted publisher") { SignedContentPackVerifier.verifyAndStage(archive(path, data, 4), createTempDir(), pair.public, "other-key", 5, 3, 1000) }
        rejects("javascript path") { SignedContentPackVerifier.verifyAndStage(archive("content/payload.js", "alert(1)".toByteArray(), 4, mediaType = "application/json"), createTempDir(), pair.public, "test-key", 5, 3, 1000) }
        rejects("path traversal") { SignedContentPackVerifier.verifyAndStage(archive("content/../escape.json", "[]".toByteArray(), 4), createTempDir(), pair.public, "test-key", 5, 3, 1000) }
    }

    @Test fun rejectsHashMismatchWithoutLeavingStagedFiles() {
        val temp = createTempDir(prefix = "pack-hash-")
        val stage = File(temp, "stage")
        val archive = archive("content/recipes.json", "[]".toByteArray(), 4, zipDataOverride = "[1]".toByteArray())
        rejects("hash mismatch") { SignedContentPackVerifier.verifyAndStage(archive, stage, pair.public, "test-key", 5, 3, 1000) }
        assertFalse(stage.exists())
        temp.deleteRecursively()
    }

    @Test fun activationFailureRestoresPreviousGoodContent() {
        val root = createTempDir(prefix = "pack-rollback-")
        val active = File(root, "active").apply { mkdirs() }
        val previous = File(root, "previous")
        File(active, "sentinel.txt").writeText("known-good")
        val staged = SignedContentPackVerifier.verifyAndStage(archive("content/recipes.json", "[]".toByteArray(), 4), File(root, "stage"), pair.public, "test-key", 5, 3, 1000)
        try {
            SignedContentPackVerifier.activate(staged, active, previous) { throw IllegalStateException("version commit failed") }
            fail("activation should fail")
        } catch (_: IllegalStateException) { }
        assertEquals("known-good", File(active, "sentinel.txt").readText())
        assertFalse(previous.exists())
        root.deleteRecursively()
    }

    private fun archive(
        path: String,
        data: ByteArray,
        version: Int,
        expiresAt: Long = 2000,
        minApp: Int = 1,
        mediaType: String = "application/json",
        zipDataOverride: ByteArray = data
    ): ByteArray {
        val hash = MessageDigest.getInstance("SHA-256").digest(data).joinToString("") { "%02x".format(it) }
        val payload = JSONObject()
            .put("schemaVersion", 1)
            .put("contentVersion", version)
            .put("minAppVersion", minApp)
            .put("maxAppVersion", 10)
            .put("expiresAt", expiresAt)
            .put("entries", JSONArray().put(JSONObject().put("path", path).put("mediaType", mediaType).put("bytes", data.size).put("sha256", hash).put("role", "recipe-data")))
            .toString().toByteArray(Charsets.UTF_8)
        val signer = Signature.getInstance("SHA256withRSA").apply { initSign(pair.private); update(payload) }
        val wrapper = JSONObject().put("keyId", "test-key").put("payload", Base64.getEncoder().encodeToString(payload)).put("signature", Base64.getEncoder().encodeToString(signer.sign())).toString().toByteArray(Charsets.UTF_8)
        return ByteArrayOutputStream().use { bytes ->
            ZipOutputStream(bytes).use { zip ->
                zip.putNextEntry(ZipEntry("manifest.json")); zip.write(wrapper); zip.closeEntry()
                zip.putNextEntry(ZipEntry(path)); zip.write(zipDataOverride); zip.closeEntry()
            }
            bytes.toByteArray()
        }
    }

    private fun rejects(label: String, operation: () -> Unit) {
        try { operation(); fail("Expected rejection: $label") } catch (_: IllegalArgumentException) { } catch (_: IllegalStateException) { }
    }
}
