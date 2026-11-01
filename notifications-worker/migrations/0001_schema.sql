CREATE TABLE IF NOT EXISTS subscriptions (
 endpoint TEXT PRIMARY KEY,
 p256dh TEXT NOT NULL,
 auth TEXT NOT NULL,
 locale TEXT NOT NULL CHECK(locale IN ('en-GB','pt-BR')),
 categories TEXT NOT NULL,
 consent_valid INTEGER NOT NULL DEFAULT 0 CHECK(consent_valid IN (0,1)),
 consent_receipt_hash TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS subscriptions_consent_idx ON subscriptions(consent_valid);
CREATE TABLE IF NOT EXISTS announcements (
 id TEXT PRIMARY KEY,
 release_sha TEXT NOT NULL,
 status TEXT NOT NULL,
 sent INTEGER NOT NULL DEFAULT 0,
 failed INTEGER NOT NULL DEFAULT 0,
 removed INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 completed_at INTEGER
);
