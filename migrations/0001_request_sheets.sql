-- Existing installations: apply once with Wrangler D1 migrations.
-- Original order rows and their IDs are preserved.
CREATE TABLE request_sheets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('order', 'estimate')),
  department TEXT NOT NULL,
  request_date TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE orders ADD COLUMN sheet_id TEXT REFERENCES request_sheets(id);
INSERT INTO request_sheets (id, kind, department, request_date)
SELECT 'legacy-' || id, 'order', COALESCE(NULLIF(department, ''), 'Chưa xác định khoa'), COALESCE(request_date, '') FROM orders;
UPDATE orders SET sheet_id = 'legacy-' || id;
CREATE INDEX orders_sheet_id ON orders(sheet_id);
CREATE TABLE estimate_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet_id TEXT NOT NULL REFERENCES request_sheets(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  reason TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'Không cần gấp' CHECK(priority IN ('Ưu tiên', 'Không cần gấp'))
);
CREATE INDEX estimate_items_sheet_id ON estimate_items(sheet_id);
