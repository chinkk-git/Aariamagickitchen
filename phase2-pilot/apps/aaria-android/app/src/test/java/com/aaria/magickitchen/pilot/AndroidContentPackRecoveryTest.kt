package com.aaria.magickitchen.pilot

import android.app.Application
import android.content.Context
import android.util.Base64
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class AndroidContentPackRecoveryTest {
    private lateinit var app: Application
    private lateinit var root: File
    private lateinit var preferences: android.content.SharedPreferences

    @Before fun setUp() {
        app = RuntimeEnvironment.getApplication()
        root = File(app.filesDir, "verified-content")
        root.deleteRecursively()
        preferences = app.getSharedPreferences("verified-content-packs", Context.MODE_PRIVATE)
        preferences.edit().clear().commit()
    }

    @After fun tearDown() {
        root.deleteRecursively()
        preferences.edit().clear().commit()
    }

    @Test fun refusesInstallationWhenPublisherTrustAssetsAreAbsent() {
        val repository = AndroidContentPackRepository(app, null, null)
        val encoded = Base64.encodeToString(byteArrayOf(1), Base64.NO_WRAP)
        try {
            repository.installBase64(encoded)
            throw AssertionError("Installation must fail closed without a publisher trust root")
        } catch (expected: IllegalStateException) {
            assertTrue(expected.message.orEmpty().contains("publisher key is not provisioned"))
        }
    }

    @Test fun completesVersionCommitAfterNewActiveDirectoryWasSwapped() {
        val active = File(root, "active").apply { mkdirs() }
        val previous = File(root, "previous").apply { mkdirs() }
        File(active, "pack-version.txt").writeText("8")
        File(previous, "sentinel.txt").writeText("old content")
        preferences.edit().putInt("last_accepted_content_version", 7)
            .putInt("pending_content_activation_version", 8).commit()

        AndroidContentPackRepository(app, null, null).recoverInterruptedActivation()

        assertEquals(8, preferences.getInt("last_accepted_content_version", -1))
        assertEquals(-1, preferences.getInt("pending_content_activation_version", -1))
        assertTrue(active.isDirectory)
        assertFalse(previous.exists())
    }

    @Test fun restoresPreviousGoodContentWhenPendingSwapDidNotComplete() {
        val active = File(root, "active").apply { mkdirs() }
        val previous = File(root, "previous").apply { mkdirs() }
        File(active, "pack-version.txt").writeText("99")
        File(previous, "pack-version.txt").writeText("7")
        File(previous, "sentinel.txt").writeText("known-good")
        preferences.edit().putInt("last_accepted_content_version", 7)
            .putInt("pending_content_activation_version", 8).commit()

        AndroidContentPackRepository(app, null, null).recoverInterruptedActivation()

        assertEquals(7, preferences.getInt("last_accepted_content_version", -1))
        assertEquals(-1, preferences.getInt("pending_content_activation_version", -1))
        assertEquals("7", File(active, "pack-version.txt").readText())
        assertEquals("known-good", File(active, "sentinel.txt").readText())
        assertFalse(previous.exists())
    }

    @Test fun catalogReadRecoversCompletedSwapBeforeServingPackData() {
        val active = File(root, "active").apply { mkdirs() }
        val previous = File(root, "previous").apply { mkdirs() }
        File(active, "pack-version.txt").writeText("8")
        File(active, "content").mkdirs()
        File(active, "content/catalog.json").writeText("[{\"id\":8}]")
        File(previous, "pack-version.txt").writeText("7")
        preferences.edit().putInt("last_accepted_content_version", 7)
            .putInt("pending_content_activation_version", 8).commit()

        val catalog = AndroidContentPackRepository(app, null, null).readRecipeCatalog()

        assertEquals("[{\"id\":8}]", catalog)
        assertEquals(8, preferences.getInt("last_accepted_content_version", -1))
        assertEquals(-1, preferences.getInt("pending_content_activation_version", -1))
        assertFalse(previous.exists())
    }

    @Test fun keepsExistingGoodContentWhenCrashHappenedBeforeDirectorySwap() {
        val active = File(root, "active").apply { mkdirs() }
        File(active, "pack-version.txt").writeText("7")
        File(active, "sentinel.txt").writeText("known-good")
        preferences.edit().putInt("last_accepted_content_version", 7)
            .putInt("pending_content_activation_version", 8).commit()

        AndroidContentPackRepository(app, null, null).recoverInterruptedActivation()

        assertEquals(7, preferences.getInt("last_accepted_content_version", -1))
        assertEquals(-1, preferences.getInt("pending_content_activation_version", -1))
        assertEquals("7", File(active, "pack-version.txt").readText())
        assertEquals("known-good", File(active, "sentinel.txt").readText())
    }

    @Test fun contentReadsWaitForActivationCriticalSection() {
        val repository = AndroidContentPackRepository(app, null, null)
        val content = File(root, "active/content").apply { mkdirs() }
        File(content, "catalog.json").writeText("[]")
        val locked = CountDownLatch(1)
        val release = CountDownLatch(1)
        val holder = Thread {
            synchronized(repository) {
                locked.countDown()
                release.await(5, TimeUnit.SECONDS)
            }
        }
        val reader = Executors.newSingleThreadExecutor()
        holder.start()
        try {
            assertTrue("activation lock was not acquired", locked.await(5, TimeUnit.SECONDS))
            val pendingRead = reader.submit { repository.openContentAsset("content/catalog.json") }
            try {
                pendingRead.get(150, TimeUnit.MILLISECONDS)
                throw AssertionError("content read must wait while activation holds the repository lock")
            } catch (_: TimeoutException) { }
            release.countDown()
            val stream = pendingRead.get(5, TimeUnit.SECONDS)
            assertEquals("[]", stream?.bufferedReader()?.use { it.readText() })
        } finally {
            release.countDown()
            holder.join(5_000)
            reader.shutdownNow()
        }
    }
}
