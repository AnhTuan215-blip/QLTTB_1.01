CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Bình Thường',
  department TEXT,
  department_detail TEXT,
  model TEXT,
  serial_number TEXT,
  manufacturer TEXT,
  make TEXT,
  vendor TEXT,
  warranty_start_date TEXT,
  warranty_period_months INTEGER,
  warranty_status TEXT,
  contract_date TEXT,
  installation_date TEXT,
  operation_date TEXT,
  acceptance_date TEXT,
  price REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_code TEXT,
  asset_name TEXT,
  department TEXT,
  model TEXT,
  week TEXT,
  planned_date TEXT,
  actual_date TEXT,
  status TEXT DEFAULT 'Chưa làm',
  performer TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS inspection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Bình Thường',
  department TEXT,
  department_detail TEXT,
  model TEXT,
  serial_number TEXT,
  inspection_date TEXT,
  next_deadline TEXT
);

CREATE TABLE IF NOT EXISTS atbx (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stt INTEGER,
  employee_name TEXT NOT NULL,
  expiry_date TEXT
);

CREATE TABLE IF NOT EXISTS tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  total_quantity INTEGER DEFAULT 0,
  large INTEGER DEFAULT 0,
  small INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Bình Thường',
  department TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  assignee TEXT NOT NULL,
  priority TEXT DEFAULT 'Trung bình',
  due_date TEXT,
  status TEXT DEFAULT 'Chưa làm',
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS replacement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_code TEXT,
  device_name TEXT NOT NULL,
  department TEXT,
  issue TEXT NOT NULL,
  severity TEXT DEFAULT 'Cần thay',
  reported_by TEXT,
  reported_date TEXT,
  estimated_cost REAL DEFAULT 0,
  status TEXT DEFAULT 'Chờ duyệt',
  note TEXT
);

CREATE TABLE IF NOT EXISTS oxy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_date TEXT NOT NULL,
  month TEXT,
  oxy_large INTEGER DEFAULT 0,
  oxy_small INTEGER DEFAULT 0,
  co2_large INTEGER DEFAULT 0,
  co2_small INTEGER DEFAULT 0,
  invoice TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS engineer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER,
  visit_date TEXT NOT NULL,
  engineer_name TEXT NOT NULL,
  company TEXT,
  device_name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  work_done TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS request_sheets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('order', 'estimate')),
  department TEXT NOT NULL,
  request_date TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department TEXT,
  order_name TEXT NOT NULL,
  request_date TEXT,
  approval_date TEXT,
  reason TEXT,
  note TEXT,
  status TEXT DEFAULT 'Đang xử lý',
  quantity INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  handover_date TEXT,
  receiver TEXT,
  sheet_id TEXT REFERENCES request_sheets(id)
);

CREATE INDEX IF NOT EXISTS orders_sheet_id ON orders(sheet_id);
CREATE TABLE IF NOT EXISTS estimate_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet_id TEXT NOT NULL REFERENCES request_sheets(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  reason TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'Không cần gấp' CHECK(priority IN ('Ưu tiên', 'Không cần gấp'))
);
CREATE INDEX IF NOT EXISTS estimate_items_sheet_id ON estimate_items(sheet_id);

CREATE TABLE IF NOT EXISTS handovers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department TEXT,
  handover_info TEXT NOT NULL,
  handover_date TEXT,
  receiver TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS n2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT,
  delivery_date TEXT NOT NULL,
  quantity_delivered INTEGER DEFAULT 0,
  quantity_returned INTEGER DEFAULT 0,
  invoice TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS tool_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tool_set_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  set_id INTEGER NOT NULL,
  stt INTEGER,
  tool_name TEXT NOT NULL,
  tool_code TEXT,
  manufacturer TEXT,
  quantity INTEGER DEFAULT 1,
  note TEXT,
  FOREIGN KEY (set_id) REFERENCES tool_sets(id) ON DELETE CASCADE
);
