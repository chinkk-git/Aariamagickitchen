package com.aaria.magickitchen.pilot

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KitchenBackNavigationTest {
    @Test fun nonHomeOfflineRoutesUseTheKitchenBackHandler() {
        assertTrue(shouldNavigateWebBack("creations"))
        assertTrue(shouldNavigateWebBack("recipe"))
        assertTrue(shouldNavigateWebBack("week"))
        assertTrue(shouldDispatchWebBack("home", welcomeOpen = true))
        assertTrue(shouldDispatchWebBack("recipe", welcomeOpen = false))
    }

    @Test fun homeAndUnavailableRoutesDoNotTrapTheUserInTheActivity() {
        assertFalse(shouldNavigateWebBack("home"))
        assertFalse(shouldNavigateWebBack(null))
        assertFalse(shouldNavigateWebBack(""))
        assertFalse(shouldDispatchWebBack("home", welcomeOpen = false))
    }
}
