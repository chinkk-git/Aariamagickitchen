package com.aaria.magickitchen.pilot

import android.app.Application
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ProfileStoreDatabaseTest {
    private lateinit var app: Application
    private lateinit var store: ProfileStore

    @Before fun setUp() {
        app = RuntimeEnvironment.getApplication()
        app.deleteDatabase(DB_NAME)
        store = ProfileStore(app)
    }

    @After fun tearDown() {
        store.close()
        app.deleteDatabase(DB_NAME)
    }

    @Test fun migratesLegacyStateOnceAndPreservesUnknownFields() {
        val source = """{"weeks":{"week1":{"day1":true}},"done":[7],"unknownFeature":{"value":"keep"}}"""
        val first = store.initialize(source)
        assertEquals("legacy-aaria-v4", first.getString("activeId"))
        assertEquals("LEGACY_AARIA", first.getJSONArray("profiles").getJSONObject(0).getString("chefId"))
        assertEquals("keep", first.getJSONObject("snapshot").getJSONObject("unknownFeature").getString("value"))

        val retry = store.initialize("{}")
        assertEquals(1, retry.getJSONArray("profiles").length())
        assertEquals("keep", retry.getJSONObject("snapshot").getJSONObject("unknownFeature").getString("value"))
    }

    @Test fun malformedInputDoesNotConsumeMigrationMarker() {
        try {
            store.initialize("""{"done":[1]} trailing""")
            throw AssertionError("Malformed legacy data must be rejected")
        } catch (_: IllegalArgumentException) { }

        val recovered = store.initialize("""{"done":[1],"unknown":"preserve"}""")
        assertEquals("legacy-aaria-v4", recovered.getString("activeId"))
        assertEquals("preserve", recovered.getJSONObject("snapshot").getString("unknown"))
    }

    @Test fun profileSnapshotsRemainIsolatedWhenSwitching() {
        store.initialize("{}")
        val first = store.createProfile("First", "CHEF_A", """{"favorites":["recipe-a"],"privateField":{"x":1}}""")
        val firstId = first.getString("activeId")
        assertTrue(store.saveSnapshot(firstId, """{"favorites":["recipe-a","recipe-b"]}"""))

        val second = store.createProfile("Second", "CHEF_B", """{"favorites":["recipe-z"],"done":[3]}""")
        val secondId = second.getString("activeId")
        assertFalse(firstId == secondId)
        assertEquals(listOf("recipe-z"), second.getJSONObject("snapshot").getJSONArray("favorites").let { array -> (0 until array.length()).map(array::getString) })

        val restoredFirst = store.activateProfile(firstId)
        assertEquals(listOf("recipe-a", "recipe-b"), restoredFirst.getJSONObject("snapshot").getJSONArray("favorites").let { array -> (0 until array.length()).map(array::getString) })
        assertFalse(restoredFirst.getJSONObject("snapshot").has("done"))

        val restoredSecond = store.activateProfile(secondId)
        assertEquals(listOf("recipe-z"), restoredSecond.getJSONObject("snapshot").getJSONArray("favorites").let { array -> (0 until array.length()).map(array::getString) })
        assertEquals(3, restoredSecond.getJSONObject("snapshot").getJSONArray("done").getInt(0))
    }

    @Test fun favoritesAndProgressSurviveProfileStoreRecreation() {
        val created = store.createProfile("Aaria", "CHEF_A", "{}")
        val profileId = created.getString("activeId")
        assertTrue(store.saveSnapshot(profileId, """{"favorites":["recipe-95"],"done":[95],"weeks":{"week-1":{"day-1":true}}}"""))

        store.close()
        store = ProfileStore(app)
        val restored = store.initialize("{}")

        assertEquals(profileId, restored.getString("activeId"))
        assertEquals("recipe-95", restored.getJSONObject("snapshot").getJSONArray("favorites").getString(0))
        assertEquals(95, restored.getJSONObject("snapshot").getJSONArray("done").getInt(0))
        assertTrue(restored.getJSONObject("snapshot").getJSONObject("weeks").getJSONObject("week-1").getBoolean("day-1"))
    }

    @Test fun chefChoiceCannotMutateInactiveProfile() {
        val first = store.createProfile("First", "CHEF_A", "{}")
        val firstId = first.getString("activeId")
        val second = store.createProfile("Second", "CHEF_B", "{}")
        val secondId = second.getString("activeId")

        assertFalse(store.chooseChef(firstId, "CHEF_B"))
        fun chefFor(snapshot: org.json.JSONObject, id: String): String {
            val profiles = snapshot.getJSONArray("profiles")
            return (0 until profiles.length()).map { profiles.getJSONObject(it) }
                .first { it.getString("id") == id }.getString("chefId")
        }

        val stillSecond = store.initialize("{}")
        assertEquals("CHEF_B", chefFor(stillSecond, secondId))
        assertEquals("CHEF_A", chefFor(stillSecond, firstId))

        val activeFirst = store.activateProfile(firstId)
        assertTrue(store.chooseChef(activeFirst.getString("activeId"), "CHEF_B"))
        val updatedFirst = store.initialize("{}")
        assertEquals("CHEF_B", chefFor(updatedFirst, firstId))
        assertEquals("CHEF_B", chefFor(updatedFirst, secondId))
    }


    @Test fun seededRealAppStateSurvivesStoreRecreationWithoutDataClear() {
        val seeded = store.createProfile("Upgrade Seed", "CHEF_A", "{}")
        val profileId = seeded.getString("activeId")
        val snapshot = """{"favorites":[27,39,40,51,63],"done":[51],"weeks":{"mon":{"recipe":27}},"shoppingList":{"milk":2},"recent":[51],"customUnknown":{"mustSurvive":"upgrade-marker-51"}}"""
        assertTrue(store.saveSnapshot(profileId, snapshot))
        val expected = store.initialize("{}").getJSONObject("snapshot").toString()
        store.close()

        // Reopening the same app-private SQLite file simulates persistence across
        // a process restart, NOT a package-manager APK upgrade.
        store = ProfileStore(app)
        val reopened = store.initialize("{}")
        assertEquals(profileId, reopened.getString("activeId"))
        assertEquals(org.json.JSONObject(expected).toString(), reopened.getJSONObject("snapshot").toString())
        assertEquals("upgrade-marker-51", reopened.getJSONObject("snapshot")
            .getJSONObject("customUnknown").getString("mustSurvive"))
    }

    companion object {
        private const val DB_NAME = "my_magical_kitchen_v3.db"
    }
}
