import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandlers, MAX_ROWS } from '../src/handlers.js';
import { createMemoryStore } from '../src/store/memory.js';

// These tests call the handlers directly (no HTTP server needed).
const make = () => createHandlers({ store: createMemoryStore(), mxChecker: null, nowYear: 2026 });

test('health reports the store type', async () => {
  const r = await make().health();
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true, store: 'memory' });
});

test('defaults returns the default ICP', async () => {
  const { json } = await make().defaults();
  assert.ok(json.targetIndustries.includes('hvac'));
  assert.equal(json.tiers.A, 80);
});

test('score ranks, saves, and the run can be read back', async () => {
  const h = make();
  const leads = [
    { 'Business Name': 'Granite Plumbing LLC', Industry: 'Plumbing Services', City: 'Tulsa', Employees: '12', Founded: '1995', 'Owner Age': '63', Email: 'dana@granite.example' },
    { 'Business Name': 'Granite Plumbing', City: 'tulsa', Phone: '(918) 555-0123' },
  ];
  const { status, json } = await h.score({ leads });
  assert.equal(status, 200);
  assert.equal(json.summary.uniqueLeads, 1);
  assert.equal(json.summary.duplicatesRemoved, 1);
  assert.equal(json.leads[0].phone, '(918) 555-0123'); // filled in from the duplicate
  assert.equal(typeof json.runId, 'string');

  const saved = await h.getRun(json.runId);
  assert.equal(saved.status, 200);
  assert.equal(saved.json.leads.length, 1);

  const list = await h.listRuns();
  assert.ok(list.json.some((r) => r.id === json.runId));
});

test('score honours a custom ICP and save=false', async () => {
  const h = make();
  const leads = [{ 'Business Name': 'Acme Dental', Industry: 'Dental Practice' }];
  const dental = await h.score({ leads, icp: { targetIndustries: ['dental'] }, save: false });
  const hvac = await h.score({ leads, icp: { targetIndustries: ['hvac'] }, save: false });
  assert.equal(dental.json.runId, null);
  assert.ok(dental.json.leads[0].score > hvac.json.leads[0].score);
});

test('score rejects bad input with a 400', async () => {
  const h = make();
  for (const body of [undefined, {}, { leads: [] }, { leads: [1, 2] }, { leads: 'nope' }, { leads: [[1]] }]) {
    assert.equal((await h.score(body)).status, 400, JSON.stringify(body));
  }
  const tooMany = { leads: Array.from({ length: MAX_ROWS + 1 }, () => ({ name: 'x' })) };
  assert.equal((await h.score(tooMany)).status, 400);
});

test('a failing store does not lose the results', async () => {
  const store = { kind: 'broken', saveRun: async () => { throw new Error('db down'); } };
  const h = createHandlers({ store, mxChecker: null, nowYear: 2026 });
  const { status, json } = await h.score({ leads: [{ 'Business Name': 'Acme Roofing' }] });
  assert.equal(status, 200);
  assert.equal(json.runId, null);
  assert.equal(json.leads.length, 1);
});

test('unknown run returns 404', async () => {
  assert.equal((await make().getRun('nope')).status, 404);
});

test('exportCsv returns CSV text', async () => {
  const h = make();
  const scored = await h.score({ leads: [{ 'Business Name': 'Acme Roofing', Industry: 'Roofing' }], save: false });
  const r = await h.exportCsv({ leads: scored.json.leads });
  assert.equal(r.status, 200);
  assert.ok(r.csv.startsWith('rank,tier,score'));
  assert.ok(r.csv.includes('Acme Roofing'));
  assert.equal((await h.exportCsv({})).status, 400);
});

test('score applies the industry filter sent by the client', async () => {
  const h = make();
  const leads = [
    { 'Business Name': 'Acme Dental', Industry: 'Dental Practice' },
    { 'Business Name': 'Beta Roofing', Industry: 'Roofing Contractor' },
  ];
  const { json } = await h.score({ leads, icp: { targetIndustries: ['dental'], mustMatchIndustry: true }, save: false });
  assert.equal(json.summary.ranked, 1);
  assert.equal(json.summary.excludedByIndustry, 1);
  assert.equal(json.icp.mustMatchIndustry, true);
  assert.equal(json.leads[0].name, 'Acme Dental');
});
