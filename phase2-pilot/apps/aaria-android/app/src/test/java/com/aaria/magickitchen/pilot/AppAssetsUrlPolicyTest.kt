package com.aaria.magickitchen.pilot

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppAssetsUrlPolicyTest {
    @Test
    fun exactArtworkBatchRoutesAreDebugOnlyAndAllowlisted() {
        assertEquals("index.html", DebugArtworkReviewRoute.resolve(false, true, "B01"))
        assertEquals("index.html", DebugArtworkReviewRoute.resolve(true, false, "B01"))
        assertEquals("artwork-review/index.html", DebugArtworkReviewRoute.resolve(true, true, null))
        assertEquals("artwork-review/exact/B01/index.html", DebugArtworkReviewRoute.resolve(true, true, "B01"))
        assertEquals("artwork-review/exact/B10/index.html", DebugArtworkReviewRoute.resolve(true, true, "B10"))
        assertEquals("artwork-review/index.html", DebugArtworkReviewRoute.resolve(true, true, "../index.html"))
        assertEquals("artwork-review/index.html", DebugArtworkReviewRoute.resolve(true, true, "B11"))
    }

    @Test
    fun acceptsOnlyTheExactHttpsOriginWithoutAuthorityExtras() {
        assertTrue(
            AppAssetsUrlPolicy.isTrustedOrigin(
                "https", AppAssetsUrlPolicy.HOST, -1, null, AppAssetsUrlPolicy.HOST
            )
        )
        assertFalse(
            AppAssetsUrlPolicy.isTrustedOrigin(
                "http", AppAssetsUrlPolicy.HOST, -1, null, AppAssetsUrlPolicy.HOST
            )
        )
        assertFalse(
            AppAssetsUrlPolicy.isTrustedOrigin(
                "https", "appassets.androidplatform.net.evil", -1, null,
                "appassets.androidplatform.net.evil"
            )
        )
        assertFalse(
            AppAssetsUrlPolicy.isTrustedOrigin(
                "https", AppAssetsUrlPolicy.HOST, 443, null, "${AppAssetsUrlPolicy.HOST}:443"
            )
        )
        assertFalse(
            AppAssetsUrlPolicy.isTrustedOrigin(
                "https", AppAssetsUrlPolicy.HOST, 8443, null, "${AppAssetsUrlPolicy.HOST}:8443"
            )
        )
        assertFalse(
            AppAssetsUrlPolicy.isTrustedOrigin(
                "https", AppAssetsUrlPolicy.HOST, -1, "attacker",
                "attacker@${AppAssetsUrlPolicy.HOST}"
            )
        )
        assertFalse(
            AppAssetsUrlPolicy.isTrustedOrigin(
                "https", AppAssetsUrlPolicy.HOST, -1, null,
                "${AppAssetsUrlPolicy.HOST}:invalid"
            )
        )
    }

    @Test
    fun blocksEverySubframeNavigationButAllowsMainFrameRouting() {
        assertTrue(AppAssetsUrlPolicy.shouldBlockSubframeNavigation(isForMainFrame = false))
        assertFalse(AppAssetsUrlPolicy.shouldBlockSubframeNavigation(isForMainFrame = true))
    }

    @Test
    fun distinguishesThePackagedHostFromOtherOrigins() {
        assertTrue(AppAssetsUrlPolicy.isAppAssetsHost(AppAssetsUrlPolicy.HOST))
        assertFalse(AppAssetsUrlPolicy.isAppAssetsHost("other.example"))
        assertFalse(AppAssetsUrlPolicy.isAppAssetsHost(null))
    }

    @Test
    fun allowsSafeRootRelativeBundledPaths() {
        assertEquals(
            AssetPathResult.Valid("index.html"),
            AppAssetsUrlPolicy.classifyAssetPath("/index.html")
        )
        assertEquals(
            AssetPathResult.Valid("images/chef.webp"),
            AppAssetsUrlPolicy.classifyAssetPath("/images/chef.webp")
        )
        assertEquals(
            AssetPathResult.Valid("artwork-review/index.html"),
            AppAssetsUrlPolicy.classifyAssetPath("/artwork-review/index.html")
        )
        assertEquals(
            AssetPathResult.Valid("artwork-review/batch-01/recipe-11.svg"),
            AppAssetsUrlPolicy.classifyAssetPath("/artwork-review/batch-01/recipe-11.svg")
        )
    }

    @Test
    fun returnsNotFoundForMissingPaths() {
        assertEquals(AssetPathResult.NotFound, AppAssetsUrlPolicy.classifyAssetPath(null))
        assertEquals(AssetPathResult.NotFound, AppAssetsUrlPolicy.classifyAssetPath(""))
        assertEquals(AssetPathResult.NotFound, AppAssetsUrlPolicy.classifyAssetPath("/"))
    }

    @Test
    fun rejectsTraversalAndMalformedAssetPaths() {
        assertEquals(AssetPathResult.Forbidden, AppAssetsUrlPolicy.classifyAssetPath("/../private.txt"))
        assertEquals(AssetPathResult.Forbidden, AppAssetsUrlPolicy.classifyAssetPath("/images/../private.txt"))
        assertEquals(AssetPathResult.Forbidden, AppAssetsUrlPolicy.classifyAssetPath("//other.example/file"))
        assertEquals(AssetPathResult.Forbidden, AppAssetsUrlPolicy.classifyAssetPath("/images\\\\private.jpg"))
        assertEquals(AssetPathResult.Forbidden, AppAssetsUrlPolicy.classifyAssetPath("/images//private.jpg"))
    }
}
