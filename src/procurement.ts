export type SheetKind = 'order' | 'estimate';
type Data = Record<string, any>;
type SheetRecord = { id: string; kind: SheetKind; department: string; request_date: string; created_at: string };
export class InputError extends Error {}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const date = (value: unknown) => {
  const valueText = text(value);
  if (!valueText) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueText) || Number.isNaN(Date.parse(valueText)) || new Date(valueText).toISOString().slice(0, 10) !== valueText) throw new InputError('Ngày không hợp lệ. Vui lòng chọn lại ngày.');
  return valueText;
};
const quantity = (value: unknown, minimum: number) => {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number < minimum) throw new InputError(`Số lượng phải là số nguyên từ ${minimum} trở lên.`);
  return number;
};
export function normalizeSheet(body: Data, kind: SheetKind) {
  if (!body || !text(body.department)) throw new InputError('Vui lòng nhập khoa/phòng.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) throw new InputError('Mỗi phiếu cần từ 1 đến 100 thiết bị.');
  const seen = new Set<number>();
  const items: Data[] = body.items.map((item: Data, index: number) => {
    if (!item || typeof item !== 'object') throw new InputError(`Dòng ${index + 1} không hợp lệ.`);
    const id = item.id;
    if (id != null) {
      if (!Number.isSafeInteger(id) || id < 1 || seen.has(id)) throw new InputError('Mã thiết bị không hợp lệ hoặc bị trùng.');
      seen.add(id);
    }
    const name = text(kind === 'order' ? item.order_name : item.device_name);
    if (!name) throw new InputError(`Vui lòng nhập tên thiết bị ở dòng ${index + 1}.`);
    if (kind === 'estimate') {
      let priority = text(item.priority);
      if (!priority || priority.toLowerCase().includes('không')) {
        priority = 'Không cần gấp';
      } else if (priority === 'Ưu tiên' || priority.toLowerCase().includes('ưu tiên') || priority.toLowerCase().includes('gấp')) {
        priority = 'Ưu tiên';
      } else {
        priority = 'Không cần gấp';
      }
      return { id, device_name: name, quantity: quantity(item.quantity ?? 1, 1), reason: text(item.reason), priority };
    }
    const status = item.status || 'Đang xử lý';
    if (!['Đang xử lý', 'Chờ phê duyệt', 'Đã giao hàng'].includes(status)) throw new InputError('Trạng thái đơn hàng không hợp lệ.');
    return { id, order_name: name, quantity: quantity(item.quantity ?? 0, 0), total_quantity: quantity(item.total_quantity ?? 0, 0), reason: text(item.reason), note: text(item.note), status, approval_date: date(item.approval_date), handover_date: date(item.handover_date), receiver: text(item.receiver) };
  });
  return { department: text(body.department), request_date: date(body.request_date), items };
}
export function orderInsert(db: D1Database, sheetId: string, department: string, requestDate: string, item: Data) {
  return db.prepare(`INSERT INTO orders (sheet_id, department, request_date, order_name, quantity, total_quantity, reason, note, status, approval_date, handover_date, receiver) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(sheetId, department, requestDate, item.order_name, item.quantity, item.total_quantity, item.reason, item.note, item.status, item.approval_date, item.handover_date, item.receiver);
}
export async function readSheet(db: D1Database, id: string) {
  const sheet = await db.prepare('SELECT * FROM request_sheets WHERE id = ?').bind(id).first<SheetRecord>();
  if (!sheet) return null;
  const table = sheet.kind === 'order' ? 'orders' : 'estimate_items';
  const { results } = await db.prepare(`SELECT * FROM ${table} WHERE sheet_id = ? ORDER BY id`).bind(id).all();
  return { ...sheet, items: results };
}
export async function createSheet(db: D1Database, body: Data, kind: SheetKind) {
  const data = normalizeSheet(body, kind);
  const id = crypto.randomUUID();
  const statements = [db.prepare('INSERT INTO request_sheets (id, kind, department, request_date) VALUES (?, ?, ?, ?)').bind(id, kind, data.department, data.request_date)];
  for (const item of data.items) {
    statements.push(kind === 'order' ? orderInsert(db, id, data.department, data.request_date, item) : db.prepare('INSERT INTO estimate_items (sheet_id, device_name, quantity, reason, priority) VALUES (?, ?, ?, ?, ?)').bind(id, item.device_name, item.quantity, item.reason, item.priority));
  }
  await db.batch(statements);
  return readSheet(db, id);
}
// Excel import: each department and request date is a separate sheet, within this import only.
export async function importOrders(db: D1Database, items: Data[]) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new InputError('Mỗi lần nhập cần từ 1 đến 100 đơn hàng.');
  const groups = new Map<string, Data>();
  for (const item of items) {
    if (!item || typeof item !== 'object') throw new InputError('Dữ liệu đơn hàng không hợp lệ.');
    const department = text(item.department) || 'Chưa xác định khoa';
    const request_date = date(item.request_date);
    const key = JSON.stringify([department, request_date]);
    if (!groups.has(key)) groups.set(key, { department, request_date, items: [] });
    groups.get(key)!.items.push(item);
  }
  const statements: D1PreparedStatement[] = [];
  for (const group of groups.values()) {
    const data = normalizeSheet(group, 'order');
    const id = crypto.randomUUID();
    statements.push(db.prepare('INSERT INTO request_sheets (id, kind, department, request_date) VALUES (?, ?, ?, ?)').bind(id, 'order', data.department, data.request_date));
    for (const item of data.items) statements.push(orderInsert(db, id, data.department, data.request_date, item));
  }
  await db.batch(statements);
  return { success: true, count: items.length, sheets: groups.size };
}

export async function importEstimates(db: D1Database, items: Data[]) {
  if (!Array.isArray(items) || !items.length || items.length > 500) throw new InputError('Mỗi lần nhập cần từ 1 đến 500 thiết bị dự trù.');
  const groups = new Map<string, Data>();
  for (const item of items) {
    if (!item || typeof item !== 'object') throw new InputError('Dữ liệu dự trù không hợp lệ.');
    const department = text(item.department) || 'Chưa xác định khoa';
    let request_date = '';
    try {
      request_date = date(item.request_date);
    } catch {
      request_date = '';
    }
    const key = JSON.stringify([department, request_date]);
    if (!groups.has(key)) groups.set(key, { department, request_date, items: [] });
    groups.get(key)!.items.push(item);
  }
  const statements: D1PreparedStatement[] = [];
  for (const group of groups.values()) {
    const chunkSize = 100;
    for (let i = 0; i < group.items.length; i += chunkSize) {
      const subItems = group.items.slice(i, i + chunkSize);
      const data = normalizeSheet({ department: group.department, request_date: group.request_date, items: subItems }, 'estimate');
      const id = crypto.randomUUID();
      statements.push(db.prepare('INSERT INTO request_sheets (id, kind, department, request_date) VALUES (?, ?, ?, ?)').bind(id, 'estimate', data.department, data.request_date));
      for (const item of data.items) {
        statements.push(db.prepare('INSERT INTO estimate_items (sheet_id, device_name, quantity, reason, priority) VALUES (?, ?, ?, ?, ?)').bind(id, item.device_name, item.quantity, item.reason, item.priority));
      }
    }
  }
  await db.batch(statements);
  return { success: true, count: items.length, sheets: groups.size };
}

