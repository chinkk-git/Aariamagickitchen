package com.aaria.magickitchen.pilot

import android.app.Application
import android.util.Base64
import java.io.File
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class AndroidContentPackRepositoryTest {
    private lateinit var app: Application
    private lateinit var root: File

    @Before fun setUp() {
        app = RuntimeEnvironment.getApplication()
        root = File(app.filesDir, "verified-content")
        root.deleteRecursively()
        app.getSharedPreferences("verified-content-packs", 0).edit().clear().commit()
    }

    @After fun tearDown() {
        root.deleteRecursively()
        app.getSharedPreferences("verified-content-packs", 0).edit().clear().commit()
    }

    @Test fun missingPublisherKeyFailsClosedBeforeChangingContentOrVersionState() {
        val repository = AndroidContentPackRepository(app, publisherKey = null, publisherKeyId = "test-key")
        val encoded = Base64.encodeToString(byteArrayOf(1, 2, 3), Base64.NO_WRAP)

        try {
            repository.installBase64(encoded)
            throw AssertionError("Expected missing publisher key to reject content installation")
        } catch (error: IllegalStateException) {
            assertEquals("Trusted content publisher key is not provisioned", error.message)
        }

        assertFalse("No verified content directory may be created", root.exists())
        val preferences = app.getSharedPreferences("verified-content-packs", 0)
        assertFalse("No accepted content version may be written", preferences.contains("last_accepted_content_version"))
        assertFalse("No activation recovery marker may be written", preferences.contains("pending_content_activation_version"))
    }
}
