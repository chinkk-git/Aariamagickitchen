package com.aaria.magickitchen.pilot

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import java.io.File
import java.io.FileNotFoundException

class ShareImageProvider : ContentProvider() {
    override fun onCreate() = true

    override fun getType(uri: Uri): String = if (uri.lastPathSegment?.endsWith(".png") == true) "image/png" else "image/jpeg"

    override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor {
        val file = sharedFile(uri, allowMissingCapture = true)
        val columns = projection ?: arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE)
        return MatrixCursor(columns, 1).apply {
            addRow(columns.map { column ->
                when (column) {
                    OpenableColumns.DISPLAY_NAME -> file.name
                    OpenableColumns.SIZE -> file.length()
                    else -> null
                }
            })
        }
    }

    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor {
        val route = uri.pathSegments.firstOrNull()
        val writableRoute = route == "capture" || route == "creations"
        if (writableRoute && mode in setOf("w", "wt", "rw", "rwt")) {
            val file = sharedFile(uri, allowMissingCapture = true)
            val writeMode = when (mode) {
                "rw", "rwt" -> ParcelFileDescriptor.MODE_READ_WRITE or ParcelFileDescriptor.MODE_CREATE
                else -> ParcelFileDescriptor.MODE_WRITE_ONLY or ParcelFileDescriptor.MODE_CREATE
            }
            val truncate = mode in setOf("w", "wt", "rwt")
            return ParcelFileDescriptor.open(
                file,
                writeMode or if (truncate) ParcelFileDescriptor.MODE_TRUNCATE else 0
            )
        }
        if (mode != "r" || route == "capture") throw SecurityException("Invalid shared image access")
        val file = sharedFile(uri)
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    }

    private fun sharedFile(uri: Uri, allowMissingCapture: Boolean = false): File {
        val route = uri.pathSegments.firstOrNull()
        val base = when (route) {
            "capture" -> File(requireNotNull(context).cacheDir, "shared-posts")
            "creations" -> File(requireNotNull(context).filesDir, "dish-creations")
            else -> throw FileNotFoundException("Invalid shared image path")
        }.canonicalFile
        if (route == "creations") base.mkdirs()
        val name = uri.lastPathSegment?.takeIf { it.matches(Regex("[a-f0-9-]{36}\\.(jpg|png)")) }
            ?: throw FileNotFoundException("Invalid shared image")
        val allowMissing = allowMissingCapture && route in setOf("capture", "creations")
        val file = File(base, name).canonicalFile
        if (!file.path.startsWith(base.path + File.separator)) throw FileNotFoundException("Invalid shared image")
        if (!file.isFile && !allowMissing) throw FileNotFoundException("Image not found")
        return file
    }

    override fun insert(uri: Uri, values: ContentValues?): Uri? = throw UnsupportedOperationException()
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = throw UnsupportedOperationException()
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = throw UnsupportedOperationException()
}
