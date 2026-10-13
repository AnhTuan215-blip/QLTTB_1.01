import { Hono } from 'hono';
import { Env } from '../types';

const app = new Hono<Env>();

app.get('/', async (c) => {
  const today = new Date().toISOString().split('T')[0];
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const in90 = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  const results = await c.env.DB.batch([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM assets'),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM maintenance'),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM inspection'),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM atbx'),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM tools'),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM tasks'),
    // By status
    c.env.DB.prepare('SELECT status, COUNT(*) as count FROM assets GROUP BY status'),
    // By department
    c.env.DB.prepare('SELECT department, COUNT(*) as count FROM assets GROUP BY department'),
    // By warranty
    c.env.DB.prepare('SELECT warranty_status, COUNT(*) as count FROM assets WHERE warranty_status != "" GROUP BY warranty_status'),
    // Inspection deadlines
    c.env.DB.prepare('SELECT COUNT(*) as count FROM inspection WHERE next_deadline < ?').bind(today),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM inspection WHERE next_deadline >= ? AND next_deadline <= ?').bind(today, in30),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM inspection WHERE next_deadline > ? AND next_deadline <= ?').bind(in30, in90),
    // ATBX deadlines
    c.env.DB.prepare('SELECT COUNT(*) as count FROM atbx WHERE expiry_date < ?').bind(today),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM atbx WHERE expiry_date >= ? AND expiry_date <= ?').bind(today, in30),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM atbx WHERE expiry_date > ? AND expiry_date <= ?').bind(in30, in90),
    // Task stats
    c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'Chưa làm'"),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'Đang làm'"),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'Hoàn thành'"),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM tasks WHERE status != 'Hoàn thành' AND due_date < ?").bind(today),
    // Replacement stats
    c.env.DB.prepare("SELECT COUNT(*) as count FROM replacement WHERE status = 'Chờ duyệt'"),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM replacement WHERE status IN ('Đã duyệt', 'Đang xử lý')"),
    c.env.DB.prepare('SELECT COALESCE(SUM(estimated_cost), 0) as total FROM replacement'),
  ]);

  const toObj = (rows: Record<string, unknown>[], keyField: string) => {
    const obj: Record<string, number> = {};
    rows.forEach((r) => { if (r[keyField]) obj[r[keyField] as string] = r.count as number; });
    return obj;
  };

  const count = (i: number) => (results[i].results[0] as Record<string, number>)?.count ?? 0;

  return c.json({
    totalAssets: count(0),
    totalMaintenance: count(1),
    totalInspection: count(2),
    totalAtbx: count(3),
    totalTools: count(4),
    totalTasks: count(5),
    byStatus: toObj(results[6].results as Record<string, unknown>[], 'status'),
    byDepartment: toObj(results[7].results as Record<string, unknown>[], 'department'),
    byWarranty: toObj(results[8].results as Record<string, unknown>[], 'warranty_status'),
    inspectionDeadlines: { expired: count(9), within30: count(10), within90: count(11) },
    atbxDeadlines: { expired: count(12), within30: count(13), within90: count(14) },
    taskStats: { todo: count(15), doing: count(16), done: count(17), overdue: count(18) },
    replacementStats: {
      pending: count(19),
      processing: count(20),
      totalCost: (results[21].results[0] as Record<string, number>)?.total ?? 0,
    },
  });
});

export default app;
