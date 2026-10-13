-- Only after initializing an empty database with the current schema.sql.
-- Its schema already includes migration 0001; record that baseline once.
CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO d1_migrations (name)
SELECT '0001_request_sheets.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0001_request_sheets.sql');
