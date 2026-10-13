# TBYT Manager - API Contract

Tất cả endpoint dưới `/api`. Content-Type: `application/json`.

## Response format

**Success:**
```json
{ "success": true, "data": { ... } }
```
Hoặc trả thẳng object/array cũng được, miễn consistent.

**Error:**
```json
{ "error": "Message", "code": 400 }
```

---

## 0. GET /api/bootstrap

Lấy tất cả data trong 1 call. Dùng cho initial load để giảm round-trip.

**Response:**
```json
{
  "assets": [...],
  "maintenance": [...],
  "inspection": [...],
  "atbx": [...],
  "tools": [...],
  "tasks": [...],
  "replacement": [...],
  "oxy": [...],
  "engineer": [...],
  "dashboard": {
    "totalAssets": 10,
    "totalMaintenance": 15,
    "totalInspection": 5,
    "totalAtbx": 5,
    "totalTools": 9,
    "totalTasks": 6,
    "byStatus": { "Bình Thường": 7, "Hư Hỏng": 2, "Hỏng": 1 },
    "byDepartment": { "VLTL": 3, "Phòng Khám": 4, ... },
    "byWarranty": { "Còn bảo hành": 4, "Hết bảo hành": 6 },
    "inspectionDeadlines": { "within30": 0, "within90": 3, "expired": 0 },
    "atbxDeadlines": { "within30": 2, "within90": 2, "expired": 0 },
    "taskStats": { "todo": 3, "doing": 2, "done": 1, "overdue": 0 },
    "replacementStats": { "pending": 2, "processing": 1, "totalCost": 48500000 }
  }
}
```

---

## 1. Assets

### GET /api/assets
Response: `[{ id, code, name, status, department, ... }]`

### POST /api/assets
Request body:
```json
{
  "code": "HNH000999",
  "name": "Máy mới",
  "status": "Bình Thường",
  "department": "VLTL",
  "department_detail": "",
  "model": "ABC-123",
  "serial_number": "SN001",
  "manufacturer": "Samsung",
  "make": "Korea",
  "vendor": "Cty XYZ",
  "warranty_start_date": "2026-04-20",
  "warranty_period_months": 24
}
```

**Backend logic:**
- Validate: `code` unique, `name` required
- Auto compute `warranty_status`:
  ```
  end = warranty_start_date + warranty_period_months
  warranty_status = end >= today ? "Còn bảo hành" : "Hết bảo hành"
  ```
- `created_at`, `updated_at` = NOW

Response: `{ id, ...full_record }`

### PUT /api/assets/:id
Same as POST, update theo `id`. Tự update `warranty_status` và `updated_at`.

### DELETE /api/assets/:id
Response: `{ success: true }`

---

## 2. Maintenance

### GET /api/maintenance
Query params (optional):
- `?asset_code=HNH000120` - filter theo thiết bị
- `?week=2026-W17` - filter theo tuần
- `?status=Chưa làm`

### POST /api/maintenance
```json
{
  "asset_code": "HNH000120",
  "asset_name": "Máy siêu âm trị liệu",
  "department": "VLTL",
  "model": "BTL-4710",
  "week": "2026-W17",
  "planned_date": "2026-04-20",
  "actual_date": "",
  "status": "Chưa làm",
  "performer": "",
  "note": ""
}
```

### PUT /api/maintenance/:id
### DELETE /api/maintenance/:id

---

## 3. Inspection

### GET /api/inspection
### POST /api/inspection
```json
{
  "name": "Máy đo điện tim",
  "status": "Bình Thường",
  "department": "Khoa Cấp Cứu",
  "model": "ECG300",
  "serial_number": "SN001",
  "inspection_date": "2026-04-01",
  "next_deadline": "2027-04-01"
}
```
### PUT /api/inspection/:id
### DELETE /api/inspection/:id

---

## 4. ATBX

### GET /api/atbx
Response có tính thêm `days_remaining`:
```json
[
  {
    "id": 1,
    "stt": 1,
    "employee_name": "Phạm Quốc Thuần",
    "expiry_date": "2026-05-01",
    "days_remaining": 11
  }
]
```

### POST /api/atbx
```json
{
  "stt": 1,
  "employee_name": "Nguyễn Văn A",
  "expiry_date": "2027-05-01"
}
```
### PUT /api/atbx/:id
### DELETE /api/atbx/:id

---

## 5. Tools

### GET /api/tools
### POST /api/tools
```json
{
  "name": "kéo phẫu thuật",
  "total_quantity": 5,
  "large": 2,
  "small": 3,
  "status": "Bình Thường",
  "department": "Khoa Ngoại"
}
```
### PUT /api/tools/:id
### DELETE /api/tools/:id

---

## 6. Tasks

### GET /api/tasks
### POST /api/tasks
```json
{
  "title": "Bảo trì máy X",
  "category": "Bảo trì",
  "assignee": "Phạm Văn C",
  "priority": "Cao",
  "due_date": "2026-04-25",
  "status": "Chưa làm",
  "note": ""
}
```
Backend: `created_at` = NOW.

### PUT /api/tasks/:id
### DELETE /api/tasks/:id

### PATCH /api/tasks/:id/status
Endpoint riêng cho kanban drag-drop (tránh resend toàn bộ data).
```json
{ "status": "Đang làm" }
```

---

## 7. Replacement

### GET /api/replacement
### POST /api/replacement
```json
{
  "device_code": "HNH000027",
  "device_name": "Máy cạo vôi răng",
  "department": "Phòng Khám",
  "issue": "Motor yếu",
  "severity": "Cần thay",
  "reported_by": "BS A",
  "reported_date": "2026-04-20",
  "estimated_cost": 25000000,
  "status": "Chờ duyệt",
  "note": ""
}
```
### PUT /api/replacement/:id
### DELETE /api/replacement/:id

---

## 8. Oxy

### GET /api/oxy
Query params:
- `?month=04.2026` - filter theo tháng

### POST /api/oxy
```json
{
  "delivery_date": "2026-04-20",
  "month": "04.2026",
  "oxy_large": 20,
  "oxy_small": null,
  "co2_large": null,
  "co2_small": null,
  "invoice": "X",
  "note": ""
}
```

**Backend logic:** Nếu `month` empty và có `delivery_date`:
```javascript
const d = new Date(delivery_date);
month = `${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
```

### PUT /api/oxy/:id
### DELETE /api/oxy/:id

---

## 9. Engineer

### GET /api/engineer
### POST /api/engineer
```json
{
  "visit_id": 6,
  "visit_date": "2026-04-20",
  "engineer_name": "Phúc",
  "company": "GE",
  "device_name": "Máy siêu âm",
  "model": "Voluson E6",
  "serial_number": "E12461",
  "work_done": "Kiểm tra định kỳ",
  "note": ""
}
```

**Backend logic:** Nếu `visit_id` không cung cấp, auto = max(visit_id) + 1.

### PUT /api/engineer/:id
### DELETE /api/engineer/:id

---

## 10. Device History (gộp từ 4 bảng)

### GET /api/history/:deviceCode

Query params:
- `?serial=xxx` - để match engineer records
- `?model=yyy` - để match engineer + tasks

**Logic:**
```sql
-- maintenance
SELECT * FROM maintenance WHERE asset_code = :deviceCode ORDER BY planned_date DESC;

-- replacement
SELECT * FROM replacement WHERE device_code = :deviceCode ORDER BY reported_date DESC;

-- engineer (match theo serial HOẶC model)
SELECT * FROM engineer 
WHERE (serial_number = :serial AND serial_number != '')
   OR (model = :model AND model != '')
ORDER BY visit_date DESC;

-- tasks (fuzzy match)
SELECT * FROM tasks 
WHERE title LIKE '%' || :deviceCode || '%' 
   OR note LIKE '%' || :deviceCode || '%'
   OR title LIKE '%' || :model || '%'
ORDER BY due_date DESC;
```

Response:
```json
{
  "maintenance": [...],
  "replacement": [...],
  "engineer": [...],
  "tasks": [...]
}
```

---

## 11. Dashboard (optional, có thể lấy từ /bootstrap)

### GET /api/dashboard

Response same format như trong `/api/bootstrap.dashboard`.

---

## Validation rules

Backend nên validate các field bắt buộc:

| Resource | Required fields |
|---|---|
| assets | `code`, `name` |
| maintenance | `asset_code`, `week` |
| inspection | `name` |
| atbx | `employee_name`, `expiry_date` |
| tools | `name` |
| tasks | `title`, `assignee` |
| replacement | `device_name`, `issue` |
| oxy | `delivery_date` |
| engineer | `visit_date`, `engineer_name`, `device_name` |

Dùng Zod hoặc Valibot để validate, tự động trả 400 nếu không pass.

---

## Error codes

- 200: OK
- 400: Bad request (validation fail)
- 404: Not found
- 409: Conflict (unique constraint - VD: asset code đã tồn tại)
- 500: Server error

---

## CORS (nếu frontend tách domain)

Nếu frontend ở domain khác Worker:

```javascript
app.use('/*', cors({
  origin: ['https://tbyt.khachhang.com', 'http://localhost:8787'],
  credentials: true
}));
```

Nếu frontend served từ cùng Worker (dùng Cloudflare Pages Functions hoặc Assets), không cần config CORS.
