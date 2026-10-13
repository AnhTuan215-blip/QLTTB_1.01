import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import assets from './routes/assets';
import maintenance from './routes/maintenance';
import inspection from './routes/inspection';
import atbx from './routes/atbx';
import tools from './routes/tools';
import tasks from './routes/tasks';
import replacement from './routes/replacement';
import oxy from './routes/oxy';
import engineer from './routes/engineer';
import dashboard from './routes/dashboard';
import history from './routes/history';
import bootstrap from './routes/bootstrap';
import orders from './routes/orders';
import handover from './routes/handover';
import n2 from './routes/n2';
import toolsets from './routes/toolsets';
import requests from './routes/requests';

const app = new Hono<Env>();

// CORS for dev
app.use('/api/*', cors());

// Mount routes
app.route('/api/assets', assets);
app.route('/api/maintenance', maintenance);
app.route('/api/inspection', inspection);
app.route('/api/atbx', atbx);
app.route('/api/tools', tools);
app.route('/api/tasks', tasks);
app.route('/api/replacement', replacement);
app.route('/api/oxy', oxy);
app.route('/api/engineer', engineer);
app.route('/api/dashboard', dashboard);
app.route('/api/history', history);
app.route('/api/bootstrap', bootstrap);
app.route('/api/orders', orders);
app.route('/api/handover', handover);
app.route('/api/n2', n2);
app.route('/api/toolsets', toolsets);
app.route('/api/requests', requests);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;
