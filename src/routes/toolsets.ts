import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

// GET /api/toolsets - List all tool sets with item count
app.get('/', async (c) => {
  const { results: sets } = await c.env.DB.prepare(
    'SELECT s.*, COUNT(i.id) as item_count FROM tool_sets s LEFT JOIN tool_set_items i ON s.id = i.set_id GROUP BY s.id ORDER BY s.id DESC'
  ).all();
  return c.json(sets);
});

// POST /api/toolsets - Create new tool set
app.post('/', async (c) => {
  const body = await c.req.json();
  if (!body.name) return c.json({ error: 'name required' }, 400);

  const { meta } = await c.env.DB.prepare(
    'INSERT INTO tool_sets (name, description) VALUES (?, ?)'
  ).bind(body.name.trim(), body.description || '').run();

  const record = await c.env.DB.prepare('SELECT * FROM tool_sets WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

// PUT /api/toolsets/:id - Update tool set
app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  await c.env.DB.prepare(
    'UPDATE tool_sets SET name = ?, description = ? WHERE id = ?'
  ).bind(body.name, body.description || '', id).run();

  const record = await c.env.DB.prepare('SELECT * FROM tool_sets WHERE id = ?').bind(id).first();
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

// DELETE /api/toolsets/:id - Delete tool set and all its items
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM tool_set_items WHERE set_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM tool_sets WHERE id = ?').bind(id)
  ]);
  return c.json({ success: true });
});

// GET /api/toolsets/:setId/items - List items in set
app.get('/:setId/items', async (c) => {
  const setId = c.req.param('setId');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM tool_set_items WHERE set_id = ? ORDER BY stt ASC, id ASC'
  ).bind(setId).all();
  return c.json(results);
});

// POST /api/toolsets/:setId/items - Add item to set
app.post('/:setId/items', async (c) => {
  const setId = c.req.param('setId');
  const body = await c.req.json();
  if (!body.tool_name) return c.json({ error: 'tool_name required' }, 400);

  const { meta } = await c.env.DB.prepare(
    'INSERT INTO tool_set_items (set_id, stt, tool_name, tool_code, manufacturer, quantity, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    setId,
    body.stt || 0,
    body.tool_name.trim(),
    body.tool_code || '',
    body.manufacturer || '',
    body.quantity || 1,
    body.note || ''
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM tool_set_items WHERE id = ?').bind(meta.last_row_id).first();
  return c.json(record, 201);
});

// PUT /api/toolsets/items/:itemId - Update item
app.put('/items/:itemId', async (c) => {
  const itemId = c.req.param('itemId');
  const body = await c.req.json();

  await c.env.DB.prepare(
    'UPDATE tool_set_items SET stt = ?, tool_name = ?, tool_code = ?, manufacturer = ?, quantity = ?, note = ? WHERE id = ?'
  ).bind(
    body.stt || 0,
    body.tool_name,
    body.tool_code || '',
    body.manufacturer || '',
    body.quantity || 1,
    body.note || '',
    itemId
  ).run();

  const record = await c.env.DB.prepare('SELECT * FROM tool_set_items WHERE id = ?').bind(itemId).first();
  if (!record) return c.json({ error: 'Not found' }, 404);
  return c.json(record);
});

// DELETE /api/toolsets/items/:itemId - Delete single item
app.delete('/items/:itemId', async (c) => {
  const itemId = c.req.param('itemId');
  await c.env.DB.prepare('DELETE FROM tool_set_items WHERE id = ?').bind(itemId).run();
  return c.json({ success: true });
});

// POST /api/toolsets/:setId/items/bulk-delete - Bulk delete selected items
app.post('/:setId/items/bulk-delete', async (c) => {
  const body = await c.req.json();
  const ids: number[] = body.ids || [];
  if (!Array.isArray(ids) || ids.length === 0) return c.json({ error: 'ids array required' }, 400);

  const statements = ids.map(id => c.env.DB.prepare('DELETE FROM tool_set_items WHERE id = ?').bind(id));
  await c.env.DB.batch(statements);
  return c.json({ success: true, count: ids.length });
});

// POST /api/toolsets/:setId/items/batch - Batch import items from Excel
app.post('/:setId/items/batch', async (c) => {
  const setId = c.req.param('setId');
  const items = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: 'Array of items required' }, 400);

  const statements = items.map((body: any, idx: number) => {
    return c.env.DB.prepare(
      'INSERT INTO tool_set_items (set_id, stt, tool_name, tool_code, manufacturer, quantity, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      setId,
      body.stt || (idx + 1),
      body.tool_name || body.name || '',
      body.tool_code || body.code || '',
      body.manufacturer || '',
      body.quantity || 1,
      body.note || ''
    );
  });

  const results = await c.env.DB.batch(statements);
  return c.json({ success: true, count: results.length }, 201);
});

export default app;
