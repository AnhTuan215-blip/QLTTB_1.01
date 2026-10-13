-- Read-only inspection. Does not create, update or delete data.
SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;
PRAGMA table_info(orders);
PRAGMA table_info(request_sheets);
PRAGMA table_info(estimate_items);
