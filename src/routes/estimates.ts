import { Hono } from 'hono';
import { Env } from '../types';
import { InputError, importEstimates } from '../procurement';

const app = new Hono<Env>();
app.onError((error, c) => {
  if (error instanceof InputError || error instanceof SyntaxError) return c.json({ error: error.message }, 400);
  console.error('Estimates error:', error);
  return c.json({ error: 'Không thể cập nhật dự trù.' }, 500);
});

app.get('/', async c => {
  const { results } = await c.env.DB.prepare(
    'SELECT e.*, s.department, s.request_date FROM estimate_items e JOIN request_sheets s ON e.sheet_id = s.id ORDER BY e.id DESC'
  ).all();
  return c.json(results);
});

app.post('/batch', async c => {
  const body = await c.req.json();
  return c.json(await importEstimates(c.env.DB, body), 201);
});

export default app;
