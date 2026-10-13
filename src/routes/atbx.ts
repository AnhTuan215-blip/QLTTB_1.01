import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

function addDaysRemaining(records: Record<string, unknown>[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return records.map((r) => {
    const expiry = r.expiry_date ? new Date(r.expiry_date as string) : null;
    const daysRemaining = expiry
      ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return { ...r, days_remaining: daysRemaining };
  });
}

app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM atbx ORDER BY stt ASC').all();
  return c.json(addDaysRemaining(results));
});

app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.employee_name || !body.expiry_date) return c.json({ error: 'employee_name and expiry_date required' }, 400);

  const { meta } = await c.env.DB.prepare(
    'INSERT INTO atbx (stt, employee_name, expiry_date) VALUES (?, ?, ?)'
  ).bind(body.stt || null, body.employee_name, body.expiry_date).run();

  const record = await c.env.DB.prepare('SELECT * FROM atbx WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  await c.env.DB.prepare(
    'UPDATE atbx SET stt=?, employee_name=?, expiry_date=? WHERE id=?'
  ).bind(body.stt || null, body.employee_name, body.expiry_date, id).run();

  const record = await c.env.DB.prepare('SELECT * FROM atbx WHERE id = ?').bind(id).first();
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

app.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM atbx WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.post('/batch', async (c) => {
  const items = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'Array of items required' }, 400);

  const statements = items.map((body: any) => {
    return c.env.DB.prepare(
      'INSERT INTO atbx (stt, employee_name, expiry_date) VALUES (?, ?, ?)'
    ).bind(
      body.stt || 0, body.employee_name || '', body.expiry_date || ''
    );
  });

  const results = await c.env.DB.batch(statements);
  return c.json({ success: true, count: results.length }, 201);
});

export default app;
