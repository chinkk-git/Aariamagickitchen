package com.aaria.magickitchen.pilot

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KitchenBackNavigationTest {
    @Test fun nonHomeOfflineRoutesUseTheKitchenBackHandler() {
        assertTrue(shouldNavigateWebBack("creations"))
        assertTrue(shouldNavigateWebBack("recipe"))
        assertTrue(shouldNavigateWebBack("week"))
    }

    @Test fun homeAndUnavailableRoutesDoNotTrapTheUserInTheActivity() {
        assertFalse(shouldNavigateWebBack("home"))
        assertFalse(shouldNavigateWebBack(null))
        assertFalse(shouldNavigateWebBack(""))
    }
}
