import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

app.get('/', async (c) => {
  try {
    const [
      assets, maintenance, inspection, atbx, tools, tasks, replacement, oxy, engineer, orders, handovers, n2, tool_sets, tool_set_items, request_sheets, estimate_items
    ] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM assets ORDER BY id DESC').all(),
      c.env.DB.prepare('SELECT * FROM maintenance ORDER BY id DESC').all(),
      c.env.DB.prepare('SELECT * FROM inspection ORDER BY id DESC').all(),
      c.env.DB.prepare('SELECT * FROM atbx ORDER BY stt ASC').all(),
      c.env.DB.prepare('SELECT * FROM tools ORDER BY id DESC').all(),
      c.env.DB.prepare('SELECT * FROM tasks ORDER BY id DESC').all(),
      c.env.DB.prepare('SELECT * FROM replacement ORDER BY id DESC').all(),
      c.env.DB.prepare('SELECT * FROM oxy ORDER BY delivery_date DESC').all(),
      c.env.DB.prepare('SELECT * FROM engineer ORDER BY visit_date DESC, visit_id DESC').all(),
      c.env.DB.prepare('SELECT * FROM orders ORDER BY id DESC').all(),
      c.env.DB.prepare('SELECT * FROM handovers ORDER BY id DESC').all(),
      c.env.DB.prepare('SELECT * FROM n2 ORDER BY delivery_date DESC').all(),
      c.env.DB.prepare('SELECT s.*, COUNT(i.id) as item_count FROM tool_sets s LEFT JOIN tool_set_items i ON s.id = i.set_id GROUP BY s.id ORDER BY s.id DESC').all(),
      c.env.DB.prepare('SELECT * FROM tool_set_items ORDER BY stt ASC, id ASC').all(),
      c.env.DB.prepare('SELECT * FROM request_sheets ORDER BY created_at DESC, rowid DESC').all(),
      c.env.DB.prepare('SELECT * FROM estimate_items ORDER BY id').all(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const atbxWithDays = ((atbx.results || []) as Record<string, unknown>[]).map((r) => {
      const expiry = r.expiry_date ? new Date(r.expiry_date as string) : null;
      const days_remaining = expiry
        ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return { ...r, days_remaining };
    });

    return c.json({
      assets: assets.results || [],
      maintenance: maintenance.results || [],
      inspection: inspection.results || [],
      atbx: atbxWithDays,
      tools: tools.results || [],
      tasks: tasks.results || [],
      replacement: replacement.results || [],
      oxy: oxy.results || [],
      engineer: engineer.results || [],
      orders: orders.results || [],
      handover: handovers.results || [],
      n2: n2.results || [],
      tool_sets: tool_sets.results || [],
      tool_set_items: tool_set_items.results || [],
      request_sheets: request_sheets.results || [],
      estimate_items: estimate_items.results || [],
    });
  } catch (err: any) {
    console.error('Bootstrap error:', err);
    return c.json({ error: err.message || 'Bootstrap failed' }, 500);
  }
});

export default app;
