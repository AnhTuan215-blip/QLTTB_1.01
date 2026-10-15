import { Hono } from 'hono';
import { Env } from '../types';
import { InputError, normalizeSheet, createSheet, readSheet, orderInsert, SheetKind, importEstimates } from '../procurement';
const app = new Hono<Env>();
app.onError((error, c) => {
  if (error instanceof InputError || error instanceof SyntaxError) return c.json({ error: error.message }, 400);
  console.error('Request sheet error:', error);
  return c.json({ error: 'Không thể lưu phiếu. Vui lòng thử lại.' }, 500);
});
app.post('/estimates/batch', async c => {
  const body = await c.req.json();
  return c.json(await importEstimates(c.env.DB, body), 201);
});
app.get('/:id', async c => {
  const sheet = await readSheet(c.env.DB, c.req.param('id'));
  return sheet ? c.json(sheet) : c.json({ error: 'Phiếu không còn tồn tại.' }, 404);
});
app.post('/', async c => {
  const body = await c.req.json();
  if (!body || !['order', 'estimate'].includes(body.kind)) return c.json({ error: 'Loại phiếu không hợp lệ.' }, 400);
  return c.json(await createSheet(c.env.DB, body, body.kind), 201);
});
app.put('/:id', async c => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const current = await readSheet(db, id);
  if (!current) return c.json({ error: 'Phiếu không còn tồn tại.' }, 404);
  const kind = current.kind as SheetKind;
  const data = normalizeSheet(await c.req.json(), kind);
  const currentIds = new Set(current.items.map((item: any) => item.id));
  if (data.items.some(item => item.id != null && !currentIds.has(item.id))) return c.json({ error: 'Thiết bị không thuộc phiếu này.' }, 400);
  const table = kind === 'order' ? 'orders' : 'estimate_items';
  const keptIds = new Set(data.items.filter(item => item.id != null).map(item => item.id));
  const statements = [db.prepare('UPDATE request_sheets SET department = ?, request_date = ? WHERE id = ?').bind(data.department, data.request_date, id)];
  for (const itemId of currentIds) {
    if (!keptIds.has(itemId)) statements.push(db.prepare(`DELETE FROM ${table} WHERE sheet_id = ? AND id = ?`).bind(id, itemId));
  }
  for (const item of data.items) {
    if (kind === 'order') {
      statements.push(item.id ? db.prepare(`UPDATE orders SET department=?, request_date=?, order_name=?, quantity=?, total_quantity=?, reason=?, note=?, status=?, approval_date=?, handover_date=?, receiver=? WHERE id=? AND sheet_id=?`)
        .bind(data.department, data.request_date, item.order_name, item.quantity, item.total_quantity, item.reason, item.note, item.status, item.approval_date, item.handover_date, item.receiver, item.id, id) : orderInsert(db, id, data.department, data.request_date, item));
    } else {
      statements.push(item.id ? db.prepare('UPDATE estimate_items SET device_name=?, quantity=?, reason=?, priority=? WHERE id=? AND sheet_id=?').bind(item.device_name, item.quantity, item.reason, item.priority, item.id, id) : db.prepare('INSERT INTO estimate_items (sheet_id, device_name, quantity, reason, priority) VALUES (?, ?, ?, ?, ?)').bind(id, item.device_name, item.quantity, item.reason, item.priority));
    }
  }
  await db.batch(statements);
  return c.json(await readSheet(db, id));
});
app.delete('/:id', async c => {
  const id = c.req.param('id');
  const db = c.env.DB;
  if (!await readSheet(db, id)) return c.json({ error: 'Phiếu không còn tồn tại.' }, 404);
  await db.batch([db.prepare('DELETE FROM orders WHERE sheet_id=?').bind(id), db.prepare('DELETE FROM estimate_items WHERE sheet_id=?').bind(id), db.prepare('DELETE FROM request_sheets WHERE id=?').bind(id)]);
  return c.json({ success: true });
});
export default app;
