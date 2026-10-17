package com.aaria.magickitchen.pilot

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** App-private profile and progress storage. All mutations are transactionally scoped to one profile. */
class ProfileStore(context: Context) : SQLiteOpenHelper(context.applicationContext, DB_NAME, null, DB_VERSION) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE profiles (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, chef_id TEXT NOT NULL, created_at INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE profile_state (profile_id TEXT PRIMARY KEY NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, snapshot TEXT NOT NULL, updated_at INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Future migrations must be additive and tested. This database has no released schema yet.
        if (oldVersion < 2) db.execSQL("CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)")
    }

    @Synchronized
    fun initialize(legacyJson: String): JSONObject {
        require(legacyJson.length <= MAX_SNAPSHOT_CHARS) { "Legacy profile snapshot is too large" }
        val legacy = runCatching { JSONObject(legacyJson) }.getOrElse { JSONObject() }
        val db = writableDatabase
        db.beginTransaction()
        try {
            val migrationComplete = meta(db, MIGRATION_KEY) == "1"
            if (!migrationComplete) {
                if (countProfiles(db) == 0L && hasUserData(legacy)) {
                    insertProfile(db, LEGACY_PROFILE_ID, "Aaria", LEGACY_CHEF_ID, legacy)
                }
                putMeta(db, MIGRATION_KEY, "1")
            }
            if (meta(db, ACTIVE_PROFILE_KEY).isNullOrBlank()) {
                queryFirstProfile(db)?.let { putMeta(db, ACTIVE_PROFILE_KEY, it) }
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
        return current(db)
    }

    @Synchronized
    fun createProfile(nameInput: String, chefIdInput: String, initialSnapshot: String): JSONObject {
        val name = ProfilePolicy.normalizedName(nameInput) ?: throw IllegalArgumentException("Enter a name of 1–24 characters")
        val chefId = ProfilePolicy.normalizedChefId(chefIdInput) ?: throw IllegalArgumentException("Choose one of the two kitchen avatars")
        require(initialSnapshot.length <= MAX_SNAPSHOT_CHARS) { "Profile snapshot is too large" }
        val snapshot = JSONObject(initialSnapshot)
        val id = UUID.randomUUID().toString()
        val db = writableDatabase
        db.beginTransaction()
        try {
            if (countProfiles(db) >= MAX_PROFILES) throw IllegalStateException("The kitchen supports up to $MAX_PROFILES profiles")
            insertProfile(db, id, name, chefId, snapshot)
            putMeta(db, ACTIVE_PROFILE_KEY, id)
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
        return current(db)
    }

    @Synchronized
    fun activateProfile(id: String): JSONObject {
        val db = writableDatabase
        db.beginTransaction()
        try {
            check(profileExists(db, id)) { "Profile not found" }
            putMeta(db, ACTIVE_PROFILE_KEY, id)
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
        return current(db)
    }

    @Synchronized
    fun saveSnapshot(id: String, snapshotJson: String): Boolean {
        if (snapshotJson.length > MAX_SNAPSHOT_CHARS) return false
        val snapshot = runCatching { JSONObject(snapshotJson) }.getOrNull() ?: return false
        val db = writableDatabase
        db.beginTransaction()
        try {
            if (meta(db, ACTIVE_PROFILE_KEY) != id || !profileExists(db, id)) return false
            val values = ContentValues().apply {
                put("snapshot", snapshot.toString())
                put("updated_at", System.currentTimeMillis())
            }
            check(db.update("profile_state", values, "profile_id=?", arrayOf(id)) == 1) { "Profile state missing" }
            db.setTransactionSuccessful()
            return true
        } finally {
            db.endTransaction()
        }
    }

    @Synchronized
    fun chooseChef(id: String, chefIdInput: String): Boolean {
        val chefId = ProfilePolicy.normalizedChefId(chefIdInput) ?: return false
        val db = writableDatabase
        val values = ContentValues().apply { put("chef_id", chefId) }
        return db.update("profiles", values, "id=?", arrayOf(id)) == 1
    }

    private fun current(db: SQLiteDatabase): JSONObject {
        val activeId = meta(db, ACTIVE_PROFILE_KEY)
        val profiles = JSONArray()
        db.rawQuery("SELECT id,name,chef_id FROM profiles ORDER BY created_at,id", null).use { c ->
            while (c.moveToNext()) {
                profiles.put(JSONObject().put("id", c.getString(0)).put("name", c.getString(1)).put("chefId", c.getString(2)))
            }
        }
        val snapshot = if (activeId.isNullOrBlank()) JSONObject() else db.rawQuery(
            "SELECT snapshot FROM profile_state WHERE profile_id=?", arrayOf(activeId)
        ).use { c -> if (c.moveToFirst()) runCatching { JSONObject(c.getString(0)) }.getOrDefault(JSONObject()) else JSONObject() }
        return JSONObject().put("profiles", profiles).put("activeId", activeId ?: JSONObject.NULL).put("snapshot", snapshot)
    }

    private fun insertProfile(db: SQLiteDatabase, id: String, name: String, chefId: String, snapshot: JSONObject) {
        db.insertOrThrow("profiles", null, ContentValues().apply {
            put("id", id); put("name", name); put("chef_id", chefId); put("created_at", System.currentTimeMillis())
        })
        db.insertOrThrow("profile_state", null, ContentValues().apply {
            put("profile_id", id); put("snapshot", snapshot.toString()); put("updated_at", System.currentTimeMillis())
        })
    }

    private fun countProfiles(db: SQLiteDatabase) = db.rawQuery("SELECT COUNT(*) FROM profiles", null).use { c -> c.moveToFirst(); c.getLong(0) }
    private fun queryFirstProfile(db: SQLiteDatabase) = db.rawQuery("SELECT id FROM profiles ORDER BY created_at,id LIMIT 1", null).use { c -> if (c.moveToFirst()) c.getString(0) else null }
    private fun profileExists(db: SQLiteDatabase, id: String) = db.rawQuery("SELECT 1 FROM profiles WHERE id=?", arrayOf(id)).use { it.moveToFirst() }
    private fun meta(db: SQLiteDatabase, key: String): String? = db.rawQuery("SELECT value FROM app_meta WHERE key=?", arrayOf(key)).use { if (it.moveToFirst()) it.getString(0) else null }
    private fun putMeta(db: SQLiteDatabase, key: String, value: String) { db.insertWithOnConflict("app_meta", null, ContentValues().apply { put("key", key); put("value", value) }, SQLiteDatabase.CONFLICT_REPLACE) }

    private fun hasUserData(state: JSONObject): Boolean = state.keys().asSequence().any { key ->
        when (val value = state.opt(key)) {
            is JSONArray -> value.length() > 0
            is JSONObject -> value.length() > 0
            is String -> value.isNotBlank()
            is Number -> value.toDouble() != 0.0
            is Boolean -> value
            else -> false
        }
    }

    companion object {
        const val MAX_PROFILES = 8
        private const val DB_NAME = "my_magical_kitchen_v3.db"
        private const val DB_VERSION = 1
        private const val MAX_SNAPSHOT_CHARS = 5_000_000
        private const val LEGACY_PROFILE_ID = "legacy-aaria-v4"
        private const val LEGACY_CHEF_ID = "LEGACY_AARIA"
        private const val MIGRATION_KEY = "legacy_v4_migration_complete"
        private const val ACTIVE_PROFILE_KEY = "active_profile_id"
    }
}

internal object ProfilePolicy {
    fun normalizedName(input: String): String? {
        val value = input.trim().replace(Regex("[\\u0000-\\u001f\\u007f]"), "")
        return value.takeIf { it.isNotEmpty() && it.length <= 24 }
    }
    fun normalizedChefId(input: String): String? = input.trim().uppercase().takeIf { it == "CHEF_A" || it == "CHEF_B" }
}
