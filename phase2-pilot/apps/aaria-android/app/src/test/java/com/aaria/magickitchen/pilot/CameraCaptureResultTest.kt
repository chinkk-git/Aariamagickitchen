package com.aaria.magickitchen.pilot

import android.net.Uri
import java.io.File
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class CameraCaptureResultTest {
    @Test fun canceledCameraCaptureCannotFallBackToPickerUri() {
        val output = File.createTempFile("aaria-camera-cancelled", ".jpg")
        output.writeBytes(byteArrayOf(1, 2, 3))
        val pickerUri = Uri.parse("content://picker/unrelated-photo")

        val result = resolveChooserResult(
            Uri.parse("content://camera/capture.jpg"), output, resultCode = 0, resultOkCode = 1,
            pickerResult = arrayOf(pickerUri)
        )

        assertNull(result)
        output.delete()
    }

    @Test fun successfulCameraCaptureReturnsOnlyTheAppCreatedCaptureUri() {
        val output = File.createTempFile("aaria-camera-success", ".jpg")
        output.writeBytes(byteArrayOf(1, 2, 3))
        val captureUri = Uri.parse("content://camera/capture.jpg")
        val pickerUri = Uri.parse("content://picker/unrelated-photo")

        val result = resolveChooserResult(
            captureUri, output, resultCode = 1, resultOkCode = 1, pickerResult = arrayOf(pickerUri)
        )

        assertArrayEquals(arrayOf(captureUri), result)
        output.delete()
    }

    @Test fun ordinaryPickerResultIsPreservedWhenNoCameraCaptureWasRequested() {
        val pickerUri = Uri.parse("content://picker/photo")
        val pickerResult = arrayOf(pickerUri)

        val result = resolveChooserResult(
            cameraCaptureUri = null, cameraCaptureFile = null, resultCode = 1, resultOkCode = 1,
            pickerResult = pickerResult
        )

        assertSame(pickerResult, result)
    }
}
