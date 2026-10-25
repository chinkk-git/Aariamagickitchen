package com.aaria.magickitchen.pilot

internal sealed class AssetPathResult {
    data class Valid(val path: String) : AssetPathResult()
    data object NotFound : AssetPathResult()
    data object Forbidden : AssetPathResult()
}

internal object AppAssetsUrlPolicy {
    const val HOST = "appassets.androidplatform.net"

    fun isAppAssetsHost(host: String?): Boolean = host == HOST

    fun shouldBlockSubframeNavigation(isForMainFrame: Boolean): Boolean = !isForMainFrame

    fun isTrustedOrigin(
        scheme: String?,
        host: String?,
        port: Int,
        userInfo: String?,
        encodedAuthority: String?
    ): Boolean =
        scheme == "https" && isAppAssetsHost(host) && port == -1 && userInfo == null &&
            encodedAuthority == HOST

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

internal object DebugArtworkReviewRoute {
    private val exactBatchPattern = Regex("B(?:0[1-9]|10)")

    fun resolve(isDebugBuild: Boolean, reviewEnabled: Boolean, batch: String?, internationalReview: Boolean = false): String {
        if (!isDebugBuild || !reviewEnabled) return "index.html"
        if (internationalReview) return "artwork-review/international-wave-1/index.html"
        if (batch == null) return "artwork-review/index.html"
        return if (exactBatchPattern.matches(batch)) {
            "artwork-review/exact/$batch/index.html"
        } else {
            "artwork-review/index.html"
        }
    }
}
