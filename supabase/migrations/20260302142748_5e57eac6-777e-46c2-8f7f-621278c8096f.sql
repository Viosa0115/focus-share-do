
-- Events: optional end_time, location, avatar
ALTER TABLE group_events ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE group_events ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE group_events ADD COLUMN IF NOT EXISTS location_url text;
ALTER TABLE group_events ADD COLUMN IF NOT EXISTS avatar_url text;

-- Todo icons
ALTER TABLE todos ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE group_todos ADD COLUMN IF NOT EXISTS icon text;
