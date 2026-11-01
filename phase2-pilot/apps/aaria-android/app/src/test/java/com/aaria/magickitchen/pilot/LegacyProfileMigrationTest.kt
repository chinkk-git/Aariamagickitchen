package com.aaria.magickitchen.pilot

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LegacyProfileMigrationTest {
    @Test fun preservesUnknownAndNestedLegacyFields() {
        val snapshot = LegacyProfileMigration.parseSnapshot(
            """{"weeks":{"week1":{"day1":true}},"done":[1,2],"newFeature":{"opaque":"keep"},"customPreference":"violet"}"""
        )
        assertEquals(2, snapshot.getJSONArray("done").length())
        assertEquals("keep", snapshot.getJSONObject("newFeature").getString("opaque"))
        assertEquals("violet", snapshot.getString("customPreference"))
        assertTrue(LegacyProfileMigration.hasUserData(snapshot))
    }

    @Test fun rejectsMalformedTrailingAndNonObjectSnapshots() {
        listOf("{broken", """{"done":[]} trailing""", "[]").forEach { source ->
            try {
                LegacyProfileMigration.parseSnapshot(source)
                throw AssertionError("Expected invalid snapshot rejection: $source")
            } catch (_: IllegalArgumentException) { }
        }
    }

    @Test fun distinguishesEmptyDefaultsFromUserData() {
        assertFalse(LegacyProfileMigration.hasUserData(LegacyProfileMigration.parseSnapshot("{}")))
        assertFalse(LegacyProfileMigration.hasUserData(LegacyProfileMigration.parseSnapshot("""{"done":[],"checks":{}}""")))
        assertTrue(LegacyProfileMigration.hasUserData(LegacyProfileMigration.parseSnapshot("""{"futureUnknownField":"kept"}""")))
    }

    @Test fun rejectsOversizedSnapshotsBeforeParsing() {
        val oversized = "{\"payload\":\"" + "x".repeat(LegacyProfileMigration.MAX_SNAPSHOT_CHARS) + "\"}"
        try {
            LegacyProfileMigration.parseSnapshot(oversized)
            throw AssertionError("Expected oversized snapshot rejection")
        } catch (_: IllegalArgumentException) { }
    }
}
