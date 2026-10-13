import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

app.get('/', async (c) => {
  const dept = c.req.query('department');
  const date = c.req.query('date');
  let sql = 'SELECT * FROM handovers';
  const conditions: string[] = [];
  const params: string[] = [];
  if (dept) { conditions.push('department = ?'); params.push(dept); }
  if (date) { conditions.push('handover_date = ?'); params.push(date); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY id DESC';
  const stmt = c.env.DB.prepare(sql);
  const { results } = params.length ? await stmt.bind(...params).all() : await stmt.all();
  return c.json(results);
});

app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.handover_info) return c.json({ error: 'handover_info required' }, 400);
  
  const { meta } = await c.env.DB.prepare(
    'INSERT INTO handovers (department, handover_info, handover_date, receiver, note) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    body.department || '',
    body.handover_info,
    body.handover_date || null,
    body.receiver || '',
    body.note || ''
  ).run();
  
  const record = await c.env.DB.prepare('SELECT * FROM handovers WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const existing = await c.env.DB.prepare('SELECT * FROM handovers WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Not found' }, 404);
  
  await c.env.DB.prepare(
    'UPDATE handovers SET department = ?, handover_info = ?, handover_date = ?, receiver = ?, note = ? WHERE id = ?'
  ).bind(
    body.department !== undefined ? body.department : existing.department,
    body.handover_info !== undefined ? body.handover_info : existing.handover_info,
    body.handover_date !== undefined ? body.handover_date : existing.handover_date,
    body.receiver !== undefined ? body.receiver : existing.receiver,
    body.note !== undefined ? body.note : existing.note,
    id
  ).run();
  
  const record = await c.env.DB.prepare('SELECT * FROM handovers WHERE id = ?').bind(id).first();
  return c.json(record);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM handovers WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

app.post('/batch', async (c) => {
  const items = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'Array of items required' }, 400);
  const statements = items.map((body: any) => {
    return c.env.DB.prepare(
      'INSERT INTO handovers (department, handover_info, handover_date, receiver, note) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      body.department || '', body.handover_info || '',
      body.handover_date || null, body.receiver || '', body.note || ''
    );
  });
  const results = await c.env.DB.batch(statements);
  return c.json({ success: true, count: results.length }, 201);
});

export default app;
