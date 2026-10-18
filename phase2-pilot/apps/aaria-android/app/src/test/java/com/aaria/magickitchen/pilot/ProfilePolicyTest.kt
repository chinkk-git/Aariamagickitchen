package com.aaria.magickitchen.pilot

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProfilePolicyTest {
    @Test fun acceptsTheTwoApprovedChefIdentifiersOnly() {
        assertEquals("CHEF_A", ProfilePolicy.normalizedChefId("chef_a"))
        assertEquals("CHEF_B", ProfilePolicy.normalizedChefId(" CHEF_B "))
        assertNull(ProfilePolicy.normalizedChefId("LEGACY_AARIA"))
        assertNull(ProfilePolicy.normalizedChefId("CHEF_C"))
    }

    @Test fun trimsAndBoundsProfileNamesWithoutControlCharacters() {
        assertEquals("Aaria", ProfilePolicy.normalizedName("  Aaria  "))
        assertEquals("AariaKitchen", ProfilePolicy.normalizedName("Aaria\nKitchen"))
        assertNull(ProfilePolicy.normalizedName("   "))
        assertNull(ProfilePolicy.normalizedName("1234567890123456789012345"))
    }
    @Test fun shareImageBridgeRejectsOversizedDataBeforeDecoding() {
        val prefix = "data:image/png;base64,"
        val maximum = NativeBridgeInputPolicy.maxEncodedShareDataUrlLength(prefix.length)
        assertEquals(true, NativeBridgeInputPolicy.isSharePostWithinLimits(prefix, "dish"))
        assertEquals(true, NativeBridgeInputPolicy.isSharePostWithinLimits(prefix + "A".repeat(maximum - prefix.length), "dish"))
        assertEquals(false, NativeBridgeInputPolicy.isSharePostWithinLimits(prefix + "A".repeat(maximum - prefix.length + 1), "dish"))
    }

    @Test fun shareImageBridgeRejectsUnsupportedMimeAndOversizedTitle() {
        assertEquals(false, NativeBridgeInputPolicy.isSharePostWithinLimits("data:image/svg+xml;base64,AAAA", "dish"))
        assertEquals(false, NativeBridgeInputPolicy.isSharePostWithinLimits("data:image/jpeg;base64,", "x".repeat(NativeBridgeInputPolicy.MAX_SHARED_TITLE_CHARS + 1)))
    }

}
