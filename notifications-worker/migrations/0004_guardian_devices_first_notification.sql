ALTER TABLE subscriptions ADD COLUMN guardian_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE subscriptions ADD COLUMN device_id TEXT;
CREATE INDEX IF NOT EXISTS subscriptions_guardian_device_idx ON subscriptions(guardian_hash,device_id,consent_valid,consent_expires_at);

CREATE TABLE guardian_devices (
  device_id TEXT PRIMARY KEY,
  guardian_hash TEXT NOT NULL,
  endpoint_hash TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL CHECK(length(device_name) BETWEEN 1 AND 32),
  platform TEXT NOT NULL CHECK(platform IN ('android','ios','desktop','other')),
  permission_status TEXT NOT NULL CHECK(permission_status IN ('granted','denied','default','unsupported')),
  subscription_status TEXT NOT NULL CHECK(subscription_status IN ('active','expired','revoked')),
  consent_expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_contact_at INTEGER NOT NULL
);
CREATE INDEX guardian_devices_owner_idx ON guardian_devices(guardian_hash,subscription_status,last_contact_at);

CREATE TABLE first_magical_notification (
  notification_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  guardian_hash TEXT NOT NULL,
  locale TEXT NOT NULL CHECK(locale IN ('en-GB','pt-BR')),
  route TEXT NOT NULL CHECK(route='/recipe/112'),
  status TEXT NOT NULL CHECK(status IN ('sending','accepted','failed')),
  error_code INTEGER,
  attempted_at INTEGER NOT NULL,
  accepted_at INTEGER,
  delivery_confirmed_at INTEGER,
  navigation_result TEXT CHECK(navigation_result IN ('opened_recipe_112','fallback_vietnam_list','did_not_open')),
  confirmed_at INTEGER
);
