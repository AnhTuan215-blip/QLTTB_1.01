import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

app.get('/:deviceCode', async (c) => {
  const deviceCode = c.req.param('deviceCode');
  const serial = c.req.query('serial') || '';
  const model = c.req.query('model') || '';

  const [maintenanceRes, replacementRes, engineerRes, tasksRes] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT * FROM maintenance WHERE asset_code = ? ORDER BY planned_date DESC').bind(deviceCode),
    c.env.DB.prepare('SELECT * FROM replacement WHERE device_code = ? ORDER BY reported_date DESC').bind(deviceCode),
    c.env.DB.prepare(
      `SELECT * FROM engineer
       WHERE (serial_number = ? AND serial_number != '')
          OR (model = ? AND model != '')
       ORDER BY visit_date DESC`
    ).bind(serial, model),
    c.env.DB.prepare(
      `SELECT * FROM tasks
       WHERE title LIKE ? OR note LIKE ? OR title LIKE ?
       ORDER BY due_date DESC`
    ).bind(`%${deviceCode}%`, `%${deviceCode}%`, `%${model}%`),
  ]);

  return c.json({
    maintenance: maintenanceRes.results,
    replacement: replacementRes.results,
    engineer: engineerRes.results,
    tasks: tasksRes.results,
  });
});

export default app;
