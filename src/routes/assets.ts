import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

function computeWarrantyStatus(startDate: string | null, months: number | null): string {
  if (!startDate || !months) return '';
  const start = new Date(startDate);
  start.setMonth(start.getMonth() + months);
  return start >= new Date() ? 'Còn bảo hành' : 'Hết bảo hành';
}

app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM assets ORDER BY id DESC').all();
  return c.json(results);
});

app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.code || !body.name) return c.json({ error: 'code and name required' }, 400);

  const warrantyStatus = computeWarrantyStatus(body.warranty_start_date, body.warranty_period_months);

  const { meta } = await c.env.DB.prepare(
    `INSERT INTO assets (code, name, status, department, department_detail, model, serial_number, manufacturer, make, vendor, warranty_start_date, warranty_period_months, warranty_status, contract_date, installation_date, operation_date, acceptance_date, price)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.code, body.name, body.status || 'Bình Thường',
    body.department || '', body.department_detail || '',
    body.model || '', body.serial_number || '',
    body.manufacturer || '', body.make || '', body.vendor || '',
    body.warranty_start_date || null, body.warranty_period_months || null,
    warrantyStatus,
    body.contract_date || null, body.installation_date || null,
    body.operation_date || null, body.acceptance_date || null,
    body.price || 0
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM assets WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const warrantyStatus = computeWarrantyStatus(body.warranty_start_date, body.warranty_period_months);

  await c.env.DB.prepare(
    `UPDATE assets SET code=?, name=?, status=?, department=?, department_detail=?, model=?, serial_number=?, manufacturer=?, make=?, vendor=?, warranty_start_date=?, warranty_period_months=?, warranty_status=?, contract_date=?, installation_date=?, operation_date=?, acceptance_date=?, price=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`
  ).bind(
    body.code, body.name, body.status,
    body.department || '', body.department_detail || '',
    body.model || '', body.serial_number || '',
    body.manufacturer || '', body.make || '', body.vendor || '',
    body.warranty_start_date || null, body.warranty_period_months || null,
    warrantyStatus,
    body.contract_date || null, body.installation_date || null,
    body.operation_date || null, body.acceptance_date || null,
    body.price || 0, id
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM assets WHERE id = ?').bind(id).first();
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM assets WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

app.post('/batch', async (c) => {
  const items = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'Array of items required' }, 400);

  const statements = items.map((body: any) => {
    const warrantyStatus = computeWarrantyStatus(body.warranty_start_date, body.warranty_period_months);
    return c.env.DB.prepare(
      `INSERT INTO assets (code, name, status, department, department_detail, model, serial_number, manufacturer, make, vendor, warranty_start_date, warranty_period_months, warranty_status, contract_date, installation_date, operation_date, acceptance_date, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.code || null, body.name || '', body.status || 'Bình Thường',
      body.department || '', body.department_detail || '',
      body.model || '', body.serial_number || '',
      body.manufacturer || '', body.make || '', body.vendor || '',
      body.warranty_start_date || null, body.warranty_period_months || null,
      warrantyStatus,
      body.contract_date || null, body.installation_date || null,
      body.operation_date || null, body.acceptance_date || null,
      body.price || 0
    );
  });

  const results = await c.env.DB.batch(statements);
  return c.json({ success: true, count: results.length }, 201);
});

export default app;
