import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM replacement ORDER BY id DESC').all();
  return c.json(results);
});

app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.device_name || !body.issue) return c.json({ error: 'device_name and issue required' }, 400);

  const { meta } = await c.env.DB.prepare(
    `INSERT INTO replacement (device_code, device_name, department, issue, severity, reported_by, reported_date, estimated_cost, status, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.device_code || '', body.device_name, body.department || '',
    body.issue, body.severity || '', body.reported_by || '',
    body.reported_date || '', body.estimated_cost || 0,
    body.status || 'Chờ duyệt', body.note || ''
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM replacement WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  await c.env.DB.prepare(
    `UPDATE replacement SET device_code=?, device_name=?, department=?, issue=?, severity=?, reported_by=?, reported_date=?, estimated_cost=?, status=?, note=? WHERE id=?`
  ).bind(
    body.device_code || '', body.device_name, body.department || '',
    body.issue, body.severity || '', body.reported_by || '',
    body.reported_date || '', body.estimated_cost || 0,
    body.status, body.note || '', id
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM replacement WHERE id = ?').bind(id).first();
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

app.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM replacement WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.post('/batch', async (c) => {
  const items = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'Array of items required' }, 400);

  const statements = items.map((body: any) => {
    return c.env.DB.prepare(
      `INSERT INTO replacement (device_code, device_name, department, issue, severity, reported_by, reported_date, estimated_cost, status, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.device_code || '', body.device_name || '', body.department || '',
      body.issue || '', body.severity || 'Cần thay', body.reported_by || '',
      body.reported_date || '', body.estimated_cost || 0,
      body.status || 'Chờ duyệt', body.note || ''
    );
  });

  const results = await c.env.DB.batch(statements);
  return c.json({ success: true, count: results.length }, 201);
});

export default app;
