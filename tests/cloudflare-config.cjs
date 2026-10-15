const assert = require('node:assert/strict');
const { test } = require('node:test');
const config = require('../wrangler.json');
const pkg = require('../package.json');
const lock = require('../package-lock.json');
const { classify, expectedSchema } = require('../scripts/setup-d1.cjs');
const expected = expectedSchema();
const rows = Object.entries(expected).flatMap(([table_name, columns]) => columns.map(column_name => ({ table_name, column_name })));
test('npm lockfile matches pinned Cloudflare dependencies and Wrangler peer requirement', () => {
  assert.equal(pkg.packageManager, 'npm@10.9.2');
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
  for (const name of ['wrangler', '@cloudflare/workers-types']) {
    assert.equal(lock.packages['node_modules/' + name].version, pkg.devDependencies[name]);
  }
  assert.equal(lock.packages['node_modules/wrangler'].peerDependencies['@cloudflare/workers-types'], '^5.20260801.1');
  const version = lock.packages['node_modules/@cloudflare/workers-types'].version.split('.').map(Number);
  assert.equal(version[0], 5);
  assert.ok(version[1] > 20260801 || (version[1] === 20260801 && version[2] >= 1));
});
test('production uses the requested account and D1 without changing local storage identity', () => {
  assert.ok(['local-d1-db', '8ce4f3e0-e3c5-48ee-b7c3-67745fa790d8'].includes(config.d1_databases[0].database_id));
  assert.equal(config.env.production.account_id, 'bd8609811af764a55dcb1c351376f5b4');
  assert.equal(config.env.production.d1_databases[0].binding, 'DB');
  assert.equal(config.env.production.d1_databases[0].database_id, '8ce4f3e0-e3c5-48ee-b7c3-67745fa790d8');
  assert.equal(config.env.production.d1_databases[0].remote, undefined);
  assert.ok(pkg.scripts.deploy.includes('--env production'));
  assert.ok(pkg.scripts.build.includes('--dry-run'));
  assert.deepEqual(config.assets.run_worker_first, ['/api/*']);
});
test('recognizes all 16 application tables', () => {
  assert.equal(Object.keys(expected).length, 16);
  assert.equal(classify(rows), 'ready');
});
test('empty/internal-only databases can be initialized', () => {
  assert.equal(classify([]), 'empty');
  assert.equal(classify([{table_name:'_cf_KV',column_name:'key'}, {table_name:'d1_migrations',column_name:'name'}]), 'empty');
});
test('legacy database is eligible only with all original columns', () => {
  const legacy = rows.filter(r => !['request_sheets','estimate_items'].includes(r.table_name) && !(r.table_name === 'orders' && r.column_name === 'sheet_id'));
  assert.equal(classify(legacy), 'legacy');
  assert.equal(classify(legacy.filter(r => !(r.table_name === 'orders' && r.column_name === 'receiver'))), 'incompatible');
});
test('rejects partially upgraded and unrelated databases', () => {
  assert.equal(classify(rows.filter(r => r.table_name !== 'estimate_items')), 'incompatible');
  assert.equal(classify([{table_name:'unrelated',column_name:'id'}]), 'incompatible');
});
