package com.aaria.magickitchen.pilot

internal sealed class AssetPathResult {
    data class Valid(val path: String) : AssetPathResult()
    data object NotFound : AssetPathResult()
    data object Forbidden : AssetPathResult()
}

internal object AppAssetsUrlPolicy {
    const val HOST = "appassets.androidplatform.net"

    fun isAppAssetsHost(host: String?): Boolean = host == HOST

    fun isTrustedOrigin(scheme: String?, host: String?, port: Int, userInfo: String?): Boolean =
        scheme == "https" && isAppAssetsHost(host) && port == -1 && userInfo == null

    fun classifyAssetPath(path: String?): AssetPathResult {
        if (path == null || path.isEmpty() || path == "/") return AssetPathResult.NotFound
        if (!path.startsWith("/") || path.startsWith("//") || path.contains('\\')) {
            return AssetPathResult.Forbidden
        }

        val segments = path.removePrefix("/").split("/")
        if (segments.any { segment ->
                segment.isEmpty() || segment == "." || segment == ".." ||
                    segment.any { it == '\u0000' || it.code < 0x20 || it.code == 0x7f }
            }) {
            return AssetPathResult.Forbidden
        }
        return AssetPathResult.Valid(segments.joinToString("/"))
    }
}
