// No remote calls run during build/deploy. The user invokes this separately.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const wrangler = path.join(root, 'node_modules/wrangler/bin/wrangler.js');

function expectedSchema() {
  const sql = fs.readFileSync(path.join(root, 'schema.sql'), 'utf8');
  return Object.fromEntries([...sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\);/g)].map(([, table, body]) => [table,
    body.split('\n').map(line => line.trim().match(/^(\w+)\s+(?:INTEGER|TEXT|REAL|DATETIME)\b/i)?.[1]).filter(Boolean)
  ]));
}
function classify(rows, expected = expectedSchema()) {
  const tables = new Map();
  for (const row of rows) {
    if (/^(sqlite_|_cf_)/.test(row.table_name) || row.table_name === 'd1_migrations') continue;
    if (!tables.has(row.table_name)) tables.set(row.table_name, new Set());
    tables.get(row.table_name).add(row.column_name);
  }
  if (!tables.size) return 'empty';
  const complete = (table, columns) => tables.has(table) && columns.every(column => tables.get(table).has(column));
  if (Object.entries(expected).every(([table, columns]) => complete(table, columns))) return 'ready';
  const legacy = Object.entries(expected).filter(([table]) => !['request_sheets', 'estimate_items'].includes(table));
  if (!tables.has('request_sheets') && !tables.has('estimate_items') && !tables.get('orders')?.has('sheet_id') &&
      legacy.every(([table, columns]) => complete(table, columns.filter(column => table !== 'orders' || column !== 'sheet_id')))) return 'legacy';
  return 'incompatible';
}
function main(args) {
  const remote = args.includes('--remote');
  const local = args.includes('--local');
  const apply = args.includes('--apply');
  const persistIndex = args.indexOf('--persist-to');
  const persist = persistIndex < 0 ? undefined : args[persistIndex + 1];
  const allowed = new Set(['--remote', '--local', '--apply', '--persist-to', persist].filter(Boolean));
  if (remote === local || args.some(arg => !allowed.has(arg)) || (remote && persistIndex >= 0) || (local && !persist)) {
    throw new Error('Use --remote [--apply], or --local --persist-to work/<isolated-folder> [--apply].');
  }
  const flags = remote ? ['--env', 'production', '--remote'] : ['--local', '--persist-to', path.resolve(root, persist)];
  if (local) {
    const relative = path.relative(path.join(root, 'work'), path.resolve(root, persist));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Local tests must use a subfolder of work/, not the live local database.');
  }
  function run(command, json = false) {
    const result = spawnSync(process.execPath, [wrangler, ...command, ...flags, ...(json ? ['--json'] : [])], {
      cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, stdio: json ? 'pipe' : 'inherit'
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(json ? (result.stderr || result.stdout || 'Wrangler failed.') : 'Wrangler failed; stopped without continuing.');
    return json ? JSON.parse(result.stdout) : undefined;
  }
  function inspect() {
    const expected = expectedSchema();
    const tables = Object.keys(expected);
    const sql = "SELECT name FROM sqlite_master WHERE type = 'table';" + tables.map(table => `PRAGMA table_info(${table});`).join('');
    const data = run(['d1', 'execute', 'DB', '--command', sql], true);
    if (!Array.isArray(data) || data.some(part => !part.success || !Array.isArray(part.results))) throw new Error('Cannot verify database structure.');
    if (data.length !== tables.length + 1) throw new Error('Incomplete schema inspection.');
    const rows = data[0].results.map(row => ({table_name:row.name, column_name:''}));
    tables.forEach((table, index) => data[index + 1].results.forEach(row => rows.push({table_name:table, column_name:row.name})));
    return classify(rows, expected);
  }
  const state = inspect();
  console.log('Database structure: ' + state + (remote ? ' (Cloudflare D1)' : ' (isolated local copy)'));
  if (state === 'incompatible') throw new Error('Unexpected/partial schema. No changes made. Inspect the database manually; do not import schema.sql over existing data.');
  if (state === 'ready') { console.log('Schema is ready. No changes needed.'); return; }
  if (!apply) { console.log('Read-only check. Add --apply to back up and initialize/upgrade this database.'); return; }
  const backupDir = path.join(root, 'work', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `d1-${remote ? 'remote' : 'test'}-${Date.now()}-${randomUUID().slice(0, 8)}.sql`);
  if (remote) {
    run(['d1', 'export', 'DB', '--output', backup]);
    if (!fs.existsSync(backup) || !fs.statSync(backup).size) throw new Error('Backup missing/empty. Stopping before schema changes.');
    console.log('Backup saved: ' + backup);
  } else {
    const source = path.resolve(root, persist);
    const destination = backup + '.local-state';
    const relative = path.relative(source, destination);
    if (!relative.startsWith('..')) throw new Error('Backup location must be outside the test state directory.');
    fs.cpSync(source, destination, { recursive: true, errorOnExist: true, force: false });
    console.log('Isolated test-state backup saved: ' + destination);
  }
  if (state === 'legacy') {
    run(['d1', 'migrations', 'apply', 'DB']);
  } else {
    run(['d1', 'execute', 'DB', '--file', 'schema.sql', '--yes']);
    run(['d1', 'execute', 'DB', '--file', 'scripts/baseline-d1.sql', '--yes']);
  }
  if (inspect() !== 'ready') throw new Error('Schema verification failed after setup. Keep the backup and inspect before deploying.');
  console.log('Database ready. Existing data was not replaced with local data.');
}
module.exports = { classify, expectedSchema };
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
