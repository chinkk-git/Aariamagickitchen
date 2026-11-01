ALTER TABLE subscriptions ADD COLUMN endpoint_hash TEXT;
ALTER TABLE subscriptions ADD COLUMN consent_expires_at INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_endpoint_hash_idx ON subscriptions(endpoint_hash);
CREATE INDEX IF NOT EXISTS subscriptions_active_expiry_endpoint_idx ON subscriptions(consent_valid,consent_expires_at,endpoint);
ALTER TABLE announcements ADD COLUMN payload TEXT;
ALTER TABLE announcements ADD COLUMN fanout_cursor TEXT NOT NULL DEFAULT '';
ALTER TABLE announcements ADD COLUMN fanout_complete INTEGER NOT NULL DEFAULT 0 CHECK(fanout_complete IN (0,1));
ALTER TABLE announcements ADD COLUMN skipped INTEGER NOT NULL DEFAULT 0;
ALTER TABLE announcements ADD COLUMN fanout_errors INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS announcement_deliveries (
 id TEXT PRIMARY KEY,
 announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
 endpoint_hash TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('recipes','features','countries','updates')),
 status TEXT NOT NULL CHECK(status IN ('pending','queued','sending','sent','failed','removed','skipped')),
 attempts INTEGER NOT NULL DEFAULT 0,
 error_code INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(announcement_id,endpoint_hash)
);
CREATE INDEX IF NOT EXISTS announcement_deliveries_status_idx ON announcement_deliveries(announcement_id,status);
