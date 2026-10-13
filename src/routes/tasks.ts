import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM tasks ORDER BY id DESC').all();
  return c.json(results);
});

app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.title || !body.assignee) return c.json({ error: 'title and assignee required' }, 400);

  const { meta } = await c.env.DB.prepare(
    `INSERT INTO tasks (title, category, assignee, priority, due_date, status, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title, body.category || '', body.assignee,
    body.priority || 'Trung bình', body.due_date || '',
    body.status || 'Chưa làm', body.note || ''
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  await c.env.DB.prepare(
    `UPDATE tasks SET title=?, category=?, assignee=?, priority=?, due_date=?, status=?, note=? WHERE id=?`
  ).bind(
    body.title, body.category || '', body.assignee || '',
    body.priority || 'Trung bình', body.due_date || '',
    body.status, body.note || '', id
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

// PATCH status only (kanban drag-drop)
app.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const { status } = await c.req.json();
  if (!status) return c.json({ error: 'status required' }, 400);

  await c.env.DB.prepare('UPDATE tasks SET status=? WHERE id=?').bind(status, id).run();
  return c.json({ success: true });
});

app.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.post('/batch', async (c) => {
  const items = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'Array of items required' }, 400);

  const statements = items.map((body: any) => {
    return c.env.DB.prepare(
      `INSERT INTO tasks (title, category, assignee, priority, due_date, status, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.title || '', body.category || 'Bảo trì', body.assignee || '',
      body.priority || 'Trung bình', body.due_date || '',
      body.status || 'Chưa làm', body.note || ''
    );
  });

  const results = await c.env.DB.batch(statements);
  return c.json({ success: true, count: results.length }, 201);
});

export default app;
