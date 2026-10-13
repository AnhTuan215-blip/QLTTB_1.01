import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM tools ORDER BY id DESC').all();
  return c.json(results);
});

app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.name) return c.json({ error: 'name required' }, 400);

  const { meta } = await c.env.DB.prepare(
    'INSERT INTO tools (name, total_quantity, large, small, status, department) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(body.name, body.total_quantity || 0, body.large || null, body.small || null, body.status || 'Bình Thường', body.department || '')
  .run();

  const record = await c.env.DB.prepare('SELECT * FROM tools WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  await c.env.DB.prepare(
    'UPDATE tools SET name=?, total_quantity=?, large=?, small=?, status=?, department=? WHERE id=?'
  ).bind(body.name, body.total_quantity || 0, body.large || null, body.small || null, body.status, body.department || '', id).run();

  const record = await c.env.DB.prepare('SELECT * FROM tools WHERE id = ?').bind(id).first();
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

app.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM tools WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.post('/batch', async (c) => {
  const items = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'Array of items required' }, 400);

  const statements = items.map((body: any) => {
    return c.env.DB.prepare(
      `INSERT INTO tools (name, total_quantity, large, small, status, department)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      body.name || '', body.total_quantity || 0, body.large || 0,
      body.small || 0, body.status || 'Bình Thường', body.department || ''
    );
  });

  const results = await c.env.DB.batch(statements);
  return c.json({ success: true, count: results.length }, 201);
});

export default app;
