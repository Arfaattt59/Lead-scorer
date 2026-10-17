import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNumber } from '../src/pipeline/parse.js';
import { normalizeRow, normalizeRows, extractDomain, nameKey } from '../src/pipeline/normalize.js';
import { dedupe } from '../src/pipeline/dedupe.js';
import { checkEmailSyntax, MxChecker, validateEmails } from '../src/pipeline/validate.js';
import { scoreLead } from '../src/pipeline/score.js';
import { mergeIcp, DEFAULT_ICP } from '../src/config/icp.js';
import { runPipeline } from '../src/pipeline/index.js';
import { toCsv } from '../src/pipeline/csv.js';

test('parseNumber understands messy values', () => {
  assert.equal(parseNumber('12'), 12);
  assert.equal(parseNumber('$2.4M'), 2_400_000);
  assert.equal(parseNumber('950k'), 950_000);
  assert.equal(parseNumber('1,200,000'), 1_200_000);
  assert.equal(parseNumber('50+'), 50);
  assert.equal(parseNumber('10-20', { allowRange: true }), 15);
  assert.equal(parseNumber('10-20'), null);
  assert.equal(parseNumber('12 months'), null);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber('n/a'), null);
  assert.equal(parseNumber(undefined), null);
});

test('normalizeRow maps aliases and cleans values', () => {
  const lead = normalizeRow({
    'Business Name': '  Summit  Ridge HVAC LLC ',
    Website: 'https://www.Summit.example/about',
    Founded: '2000',
    Employees: '10-20',
    'Annual Revenue': '$2.4M',
    'Owner Age': '61',
    'Google Rating': '7',
  }, 2026);
  assert.equal(lead.name, 'Summit Ridge HVAC LLC');
  assert.equal(lead.domain, 'summit.example');
  assert.equal(lead.yearsInBusiness, 26);
  assert.equal(lead.employees, 15);
  assert.equal(lead.revenue, 2_400_000);
  assert.equal(lead.ownerAge, 61);
  assert.equal(lead.rating, null); // out of 0-5 range
});

test('extractDomain and nameKey', () => {
  assert.equal(extractDomain('HTTP://WWW.Foo.com:8080/x?y=1'), 'foo.com');
  assert.equal(extractDomain('not a domain'), null);
  assert.equal(extractDomain(''), null);
  assert.equal(nameKey('Summit Ridge HVAC, LLC'), nameKey('summit ridge hvac inc.'));
});

test('normalizeRows skips rows with no name or website', () => {
  const { rows, skipped } = normalizeRows([{ City: 'Boise' }, { 'Business Name': 'Ok Co' }], 2026);
  assert.equal(rows.length, 1);
  assert.deepEqual(skipped, [{ row: 1, reason: 'Missing business name and website' }]);
});

test('dedupe merges by domain, name+city and email, and fills gaps', () => {
  const { rows } = normalizeRows([
    { name: 'Alpha Plumbing LLC', city: 'Boise', website: 'https://alpha.example' },
    { name: 'ALPHA PLUMBING', city: 'boise', owner: 'Sam Lee', email: 'sam@alpha.example' },
    { name: 'A.P. Services', website: 'http://www.alpha.example/' },
    { name: 'Totally Different', email: 'sam@alpha.example' }, // matches via the email filled in earlier
    { name: 'Beta Roofing', city: 'Boise' },
  ], 2026);
  const { leads, duplicatesRemoved } = dedupe(rows);
  assert.equal(leads.length, 2);
  assert.equal(duplicatesRemoved, 3);
  assert.equal(leads[0].duplicates, 3);
  assert.equal(leads[0].ownerName, 'Sam Lee');
  assert.equal(leads[0].email, 'sam@alpha.example');
  assert.deepEqual(leads[0].sourceRows, [1, 2, 3, 4]);
});

test('checkEmailSyntax', () => {
  assert.equal(checkEmailSyntax('').status, 'missing');
  assert.equal(checkEmailSyntax('bad@@x.com').status, 'invalid');
  assert.equal(checkEmailSyntax('a@b').status, 'invalid');
  assert.equal(checkEmailSyntax('info@shop.example').role, true);
  assert.equal(checkEmailSyntax('jane@gmail.com').free, true);
  assert.equal(checkEmailSyntax('jane@shop.example').role, false);
});

function fakeResolver() {
  const calls = [];
  const resolver = async (domain) => {
    calls.push(domain);
    if (domain === 'good.example') return [{ exchange: 'mx.good.example', priority: 10 }];
    if (domain === 'nomx.example') throw Object.assign(new Error('nope'), { code: 'ENOTFOUND' });
    throw Object.assign(new Error('slow'), { code: 'ETIMEOUT' });
  };
  return { resolver, calls };
}

test('MxChecker caches definite answers but retries transient failures', async () => {
  const { resolver, calls } = fakeResolver();
  const mx = new MxChecker({ resolver });
  assert.equal(await mx.check('good.example'), 'ok');
  assert.equal(await mx.check('good.example'), 'ok');
  assert.equal(calls.filter((d) => d === 'good.example').length, 1);
  assert.equal(await mx.check('nomx.example'), 'fail');
  assert.equal(await mx.check('flaky.example'), 'unknown');
  assert.equal(await mx.check('flaky.example'), 'unknown');
  assert.equal(calls.filter((d) => d === 'flaky.example').length, 2);
});

test('validateEmails sets a status per lead', async () => {
  const make = () => [
    { email: 'a@good.example' }, { email: 'b@nomx.example' }, { email: 'c@flaky.example' },
    { email: 'nope' }, { email: null },
  ];
  const withMx = await validateEmails(make(), new MxChecker({ resolver: fakeResolver().resolver }));
  assert.deepEqual(withMx.map((l) => l.emailStatus), ['verified', 'no-mail-server', 'unverified', 'invalid', 'missing']);
  const syntaxOnly = await validateEmails(make());
  assert.deepEqual(syntaxOnly.map((l) => l.emailStatus), ['valid', 'valid', 'valid', 'invalid', 'missing']);
});

const ideal = {
  name: 'X', industry: 'HVAC Contractor', employees: 20, revenue: 3e6, yearsInBusiness: 30, ownerAge: 64,
  rating: 4.6, reviews: 120, ownerName: 'Sam', emailStatus: 'verified', emailRole: false,
  phone: '(555) 555-0100', website: 'https://x.example',
};

test('an ideal lead scores 100 and the reasons add up', () => {
  const r = scoreLead(ideal, DEFAULT_ICP);
  assert.equal(r.score, 100);
  assert.equal(r.tier, 'A');
  assert.equal(r.confidence, 'High');
  assert.equal(r.reasons.reduce((s, x) => s + x.points, 0), r.score);
  assert.equal(r.reasons.reduce((s, x) => s + x.max, 0), 100);
});

test('a poor fit lands in tier C', () => {
  const r = scoreLead({
    name: 'Y', industry: 'Software Startup', employees: 400, revenue: 5e7, yearsInBusiness: 2, ownerAge: 34,
    rating: 3, reviews: 5, ownerName: null, emailStatus: 'missing', phone: null, website: null,
  }, DEFAULT_ICP);
  assert.equal(r.score, 3);
  assert.equal(r.tier, 'C');
});

test('missing data earns 1 point per factor, is not fatal, and lowers confidence', () => {
  const r = scoreLead({ name: 'Z', emailStatus: 'missing' }, DEFAULT_ICP);
  assert.equal(r.confidence, 'Low');
  assert.equal(r.score, 6);
});

test('a custom ICP changes the result', () => {
  const icp = mergeIcp({ targetIndustries: ['Dental'], employees: { min: 1, max: 10 } });
  const r = scoreLead(ideal, icp);
  assert.equal(r.reasons.find((x) => x.factor === 'Industry fit').points, 0);
  assert.ok(r.score < 100);
});

test('mergeIcp ignores invalid input', () => {
  const icp = mergeIcp({ employees: { min: 'abc', max: -5 }, tiers: { A: 10, B: 50 }, successionAge: 5 });
  assert.deepEqual(icp.employees, DEFAULT_ICP.employees);
  assert.deepEqual(icp.tiers, DEFAULT_ICP.tiers);
  assert.equal(icp.successionAge, DEFAULT_ICP.successionAge);
});

test('runPipeline ranks leads and reports a summary', async () => {
  const raw = [
    { 'Business Name': 'Poor Co', Industry: 'Software Startup', Employees: '400', Founded: '2025' },
    { 'Business Name': 'Good Heating & Air LLC', Industry: 'HVAC Contractor', City: 'Boise', Employees: '20', Founded: '1990', 'Owner Age': '65', Email: 'sam@good.example' },
    { 'Business Name': 'GOOD HEATING & AIR', City: 'boise', Website: 'https://good.example' },
    { City: 'Nowhere' },
  ];
  const { summary, leads, skipped } = await runPipeline(raw, { icp: DEFAULT_ICP, nowYear: 2026 });
  assert.equal(summary.received, 4);
  assert.equal(summary.skipped, 1);
  assert.equal(skipped.length, 1);
  assert.equal(summary.duplicatesRemoved, 1);
  assert.equal(summary.uniqueLeads, 2);
  assert.deepEqual(leads.map((l) => l.rank), [1, 2]);
  assert.equal(leads[0].name, 'Good Heating & Air LLC');
  assert.ok(leads[0].score > leads[1].score);
  assert.equal(summary.tiers.A + summary.tiers.B + summary.tiers.C, 2);
});

test('toCsv escapes quotes and blocks spreadsheet formulas', () => {
  const csv = toCsv([{ rank: 1, tier: 'A', score: 90, name: '=HYPERLINK("http://evil")', industry: 'Plumbing, Inc', reasons: [] }]);
  const [header, row] = csv.split('\n');
  assert.ok(header.startsWith('rank,tier,score'));
  assert.ok(row.includes(`"'=HYPERLINK(""http://evil"")"`));
  assert.ok(row.includes('"Plumbing, Inc"'));
});

test('mustMatchIndustry drops other and unknown industries and re-ranks', async () => {
  const raw = [
    { 'Business Name': 'Acme Dental', Industry: 'Dental Practice', City: 'Boise', Email: 'a@acme.example' },
    { 'Business Name': 'Beta Roofing', Industry: 'Roofing Contractor', City: 'Boise' },
    { 'Business Name': 'Gamma Services', City: 'Boise' },
    { 'Business Name': 'Delta Dental Group', Industry: 'Dental', City: 'Tulsa' },
  ];
  const icp = mergeIcp({ targetIndustries: ['dental'], mustMatchIndustry: true });
  const { summary, leads } = await runPipeline(raw, { icp, nowYear: 2026 });
  assert.equal(summary.uniqueLeads, 4);
  assert.equal(summary.excludedByIndustry, 2);
  assert.equal(summary.ranked, 2);
  assert.deepEqual(leads.map((l) => l.rank), [1, 2]);
  assert.ok(leads.every((l) => /dental/i.test(l.industry)));
  assert.equal(summary.tiers.A + summary.tiers.B + summary.tiers.C, 2);
});

test('industry filter is off by default and ignored when no targets are set', async () => {
  const raw = [{ 'Business Name': 'Beta Roofing', Industry: 'Roofing Contractor' }, { 'Business Name': 'Gamma' }];
  const off = await runPipeline(raw, { icp: mergeIcp({ targetIndustries: ['dental'] }), nowYear: 2026 });
  assert.equal(off.summary.ranked, 2);
  assert.equal(off.summary.excludedByIndustry, 0);
  const noTargets = await runPipeline(raw, { icp: mergeIcp({ targetIndustries: [], mustMatchIndustry: true }), nowYear: 2026 });
  assert.equal(noTargets.summary.ranked, 2);
});

test('mergeIcp only accepts a real boolean for mustMatchIndustry', () => {
  assert.equal(mergeIcp({}).mustMatchIndustry, false);
  assert.equal(mergeIcp({ mustMatchIndustry: 'yes' }).mustMatchIndustry, false);
  assert.equal(mergeIcp({ mustMatchIndustry: true }).mustMatchIndustry, true);
});

test('mergeIcp treats an emptied number field as "use the default", not 0', () => {
  const icp = mergeIcp({ employees: { min: '', max: '' }, tiers: { A: '', B: '' }, minYearsInBusiness: '' });
  assert.deepEqual(icp.employees, DEFAULT_ICP.employees);
  assert.deepEqual(icp.tiers, DEFAULT_ICP.tiers);
  assert.equal(icp.minYearsInBusiness, DEFAULT_ICP.minYearsInBusiness);
});

test('reachability note says what is present and what is missing', () => {
  const note = (lead) => scoreLead(lead, DEFAULT_ICP).reasons.find((r) => r.factor === 'Reachability').note;
  assert.equal(note({ phone: '555', website: 'a.example', emailStatus: 'missing' }),
    'no owner name, no email, phone present, website present');
  assert.equal(note({ emailStatus: 'missing' }), 'no owner name, no email, no phone, no website');
});

test('unknown data ranks above known-bad data and below known-good data', () => {
  const pts = (lead) => scoreLead({ industry: 'hvac', emailStatus: 'missing', ...lead }, DEFAULT_ICP)
    .reasons.find((r) => r.factor === 'Team size').points;
  assert.equal(pts({ employees: 400 }), 0);   // known, far outside the range
  assert.equal(pts({}), 1);                   // unknown
  assert.equal(pts({ employees: 20 }), 15);   // known, inside the range
});
