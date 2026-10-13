import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

app.get('/', async (c) => {
  let sql = 'SELECT * FROM maintenance WHERE 1=1';
  const params: string[] = [];

  const assetCode = c.req.query('asset_code');
  if (assetCode) { sql += ' AND asset_code = ?'; params.push(assetCode); }

  const week = c.req.query('week');
  if (week) { sql += ' AND week = ?'; params.push(week); }

  const status = c.req.query('status');
  if (status) { sql += ' AND status = ?'; params.push(status); }

  sql += ' ORDER BY id DESC';

  const stmt = c.env.DB.prepare(sql);
  const { results } = params.length ? await stmt.bind(...params).all() : await stmt.all();
  return c.json(results);
});

app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.asset_code || !body.week) return c.json({ error: 'asset_code and week required' }, 400);

  const { meta } = await c.env.DB.prepare(
    `INSERT INTO maintenance (asset_code, asset_name, department, model, week, planned_date, actual_date, status, performer, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.asset_code ?? '', body.asset_name ?? '', body.department ?? '', body.model ?? '',
    body.week ?? '', body.planned_date ?? '', body.actual_date ?? '',
    body.status ?? 'Chưa làm', body.performer ?? '', body.note ?? ''
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM maintenance WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const existing = await c.env.DB.prepare('SELECT * FROM maintenance WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const merged = { ...existing, ...body };

  await c.env.DB.prepare(
    `UPDATE maintenance SET asset_code=?, asset_name=?, department=?, model=?, week=?, planned_date=?, actual_date=?, status=?, performer=?, note=? WHERE id=?`
  ).bind(
    merged.asset_code ?? '', merged.asset_name ?? '', merged.department ?? '', merged.model ?? '',
    merged.week ?? '', merged.planned_date ?? '', merged.actual_date ?? '',
    merged.status ?? 'Chưa làm', merged.performer ?? '', merged.note ?? '', id
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM maintenance WHERE id = ?').bind(id).first();
  return c.json(record);
});

app.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM maintenance WHERE id = ?').bind(c.req.param('id')).run();
  return c.json({ success: true });
});

app.post('/bulk-delete', async (c) => {
  const body = await c.req.json();
  const ids: number[] = body.ids || [];
  if (!Array.isArray(ids) || ids.length === 0) return c.json({ error: 'ids array required' }, 400);

  const statements = ids.map(id => c.env.DB.prepare('DELETE FROM maintenance WHERE id = ?').bind(id));
  await c.env.DB.batch(statements);
  return c.json({ success: true, count: ids.length });
});

app.post('/batch', async (c) => {
  const items = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'Array of items required' }, 400);

  const statements = items.map((body: any) => {
    return c.env.DB.prepare(
      `INSERT INTO maintenance (asset_code, asset_name, department, model, week, planned_date, actual_date, status, performer, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.asset_code ?? '', body.asset_name ?? '', body.department ?? '',
      body.model ?? '', body.week ?? '', body.planned_date ?? '',
      body.actual_date ?? '', body.status ?? 'Chưa làm',
      body.performer ?? '', body.note ?? ''
    );
  });

  const results = await c.env.DB.batch(statements);
  return c.json({ success: true, count: results.length }, 201);
});

export default app;
