import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM engineer ORDER BY visit_date DESC, visit_id DESC').all();
  return c.json(results);
});

app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.visit_date || !body.engineer_name || !body.device_name) {
    return c.json({ error: 'visit_date, engineer_name, and device_name required' }, 400);
  }

  // Auto visit_id if not provided
  let visitId = body.visit_id;
  if (!visitId) {
    const max = await c.env.DB.prepare('SELECT MAX(visit_id) as max_id FROM engineer').first<{ max_id: number | null }>();
    visitId = (max?.max_id || 0) + 1;
  }

  const { meta } = await c.env.DB.prepare(
    `INSERT INTO engineer (visit_id, visit_date, engineer_name, company, device_name, model, serial_number, work_done, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    visitId ?? null,
    body.visit_date ?? '',
    body.engineer_name ?? '',
    body.company ?? '',
    body.device_name ?? '',
    body.model ?? '',
    body.serial_number ?? '',
    body.work_done ?? '',
    body.note ?? ''
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM engineer WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await c.env.DB.prepare('SELECT * FROM engineer WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const merged = { ...existing, ...body };

  await c.env.DB.prepare(
    `UPDATE engineer SET visit_id=?, visit_date=?, engineer_name=?, company=?, device_name=?, model=?, serial_number=?, work_done=?, note=? WHERE id=?`
  ).bind(
    merged.visit_id ?? null,
    merged.visit_date ?? '',
    merged.engineer_name ?? '',
    merged.company ?? '',
    merged.device_name ?? '',
    merged.model ?? '',
    merged.serial_number ?? '',
    merged.work_done ?? '',
    merged.note ?? '',
    id
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM engineer WHERE id = ?').bind(id).first();
  return c.json(record);
});

app.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM engineer WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.post('/batch', async (c) => {
  const items = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'Array of items required' }, 400);

  const statements = items.map((body: any) => {
    return c.env.DB.prepare(
      `INSERT INTO engineer (visit_id, visit_date, engineer_name, company, device_name, model, serial_number, work_done, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.visit_id ?? null,
      body.visit_date ?? '',
      body.engineer_name ?? '',
      body.company ?? '',
      body.device_name ?? '',
      body.model ?? '',
      body.serial_number ?? '',
      body.work_done ?? '',
      body.note ?? ''
    );
  });

  const results = await c.env.DB.batch(statements);
  return c.json({ success: true, count: results.length }, 201);
});

export default app;
