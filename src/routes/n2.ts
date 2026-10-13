import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

function computeMonth(deliveryDate: string): string {
  const d = new Date(deliveryDate);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

app.get('/', async (c) => {
  const month = c.req.query('month');
  if (month) {
    const { results } = await c.env.DB.prepare('SELECT * FROM n2 WHERE month = ? ORDER BY delivery_date DESC').bind(month).all();
    return c.json(results);
  }
  const { results } = await c.env.DB.prepare('SELECT * FROM n2 ORDER BY delivery_date DESC').all();
  return c.json(results);
});

app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.delivery_date) return c.json({ error: 'delivery_date required' }, 400);
  
  const month = body.month || computeMonth(body.delivery_date);
  
  const { meta } = await c.env.DB.prepare(
    'INSERT INTO n2 (month, delivery_date, quantity_delivered, quantity_returned, invoice, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    month,
    body.delivery_date,
    body.quantity_delivered || 0,
    body.quantity_returned || 0,
    body.invoice || '',
    body.note || ''
  ).run();
  
  const record = await c.env.DB.prepare('SELECT * FROM n2 WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const existing = await c.env.DB.prepare('SELECT * FROM n2 WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Not found' }, 404);
  
  const delivery_date = body.delivery_date !== undefined ? body.delivery_date : existing.delivery_date;
  const month = body.month !== undefined ? body.month : (body.delivery_date ? computeMonth(body.delivery_date as string) : existing.month);
  
  await c.env.DB.prepare(
    'UPDATE n2 SET month = ?, delivery_date = ?, quantity_delivered = ?, quantity_returned = ?, invoice = ?, note = ? WHERE id = ?'
  ).bind(
    month,
    delivery_date,
    body.quantity_delivered !== undefined ? body.quantity_delivered : existing.quantity_delivered,
    body.quantity_returned !== undefined ? body.quantity_returned : existing.quantity_returned,
    body.invoice !== undefined ? body.invoice : existing.invoice,
    body.note !== undefined ? body.note : existing.note,
    id
  ).run();
  
  const record = await c.env.DB.prepare('SELECT * FROM n2 WHERE id = ?').bind(id).first();
  return c.json(record);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM n2 WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

app.post('/batch', async (c) => {
  const items = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'Array of items required' }, 400);
  const statements = items.map((body: any) => {
    const month = body.month || (body.delivery_date ? computeMonth(body.delivery_date) : '');
    return c.env.DB.prepare(
      'INSERT INTO n2 (month, delivery_date, quantity_delivered, quantity_returned, invoice, note) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      month, body.delivery_date || '',
      body.quantity_delivered || 0, body.quantity_returned || 0,
      body.invoice || '', body.note || ''
    );
  });
  const results = await c.env.DB.batch(statements);
  return c.json({ success: true, count: results.length }, 201);
});

export default app;
