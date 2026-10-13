import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

function computeMonth(deliveryDate: string): string {
  const d = new Date(deliveryDate);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

app.get('/', async (c) => {
  const month = c.req.query('month');
  let sql = 'SELECT * FROM oxy';
  const params: string[] = [];

  if (month) { sql += ' WHERE month = ?'; params.push(month); }
  sql += ' ORDER BY delivery_date DESC';

  const stmt = c.env.DB.prepare(sql);
  const { results } = params.length ? await stmt.bind(...params).all() : await stmt.all();
  return c.json(results);
});

app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.delivery_date) return c.json({ error: 'delivery_date required' }, 400);

  const month = body.month || computeMonth(body.delivery_date);

  const { meta } = await c.env.DB.prepare(
    'INSERT INTO oxy (delivery_date, month, oxy_large, oxy_small, co2_large, co2_small, invoice, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    body.delivery_date, month,
    body.oxy_large || 0, body.oxy_small || 0,
    body.co2_large || 0, body.co2_small || 0,
    body.invoice || '', body.note || ''
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM oxy WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const month = body.month || (body.delivery_date ? computeMonth(body.delivery_date) : '');

  await c.env.DB.prepare(
    'UPDATE oxy SET delivery_date=?, month=?, oxy_large=?, oxy_small=?, co2_large=?, co2_small=?, invoice=?, note=? WHERE id=?'
  ).bind(
    body.delivery_date, month,
    body.oxy_large || 0, body.oxy_small || 0,
    body.co2_large || 0, body.co2_small || 0,
    body.invoice || '', body.note || '', id
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM oxy WHERE id = ?').bind(id).first();
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

app.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM oxy WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.post('/batch', async (c) => {
  const items = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'Array of items required' }, 400);

  const statements = items.map((body: any) => {
    const month = body.month || (body.delivery_date ? computeMonth(body.delivery_date) : '');
    return c.env.DB.prepare(
      'INSERT INTO oxy (delivery_date, month, oxy_large, oxy_small, co2_large, co2_small, invoice, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.delivery_date || '', month,
      body.oxy_large || 0, body.oxy_small || 0,
      body.co2_large || 0, body.co2_small || 0,
      body.invoice || '', body.note || ''
    );
  });

  const results = await c.env.DB.batch(statements);
  return c.json({ success: true, count: results.length }, 201);
});

export default app;
