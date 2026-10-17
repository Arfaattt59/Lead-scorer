// Generates SYNTHETIC demo data: every business, person, phone number and email
// below is made up (fictional names, reserved ".example" domains, 555-01xx phones).
// A fixed random seed makes the output identical every run.
//
// Usage: npm run sample

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (lo, hi) => Math.floor(lo + rand() * (hi - lo + 1));
const chance = (p) => rand() < p;

const ADJECTIVES = ['Summit', 'Ridge', 'Cedar', 'Harbor', 'Pioneer', 'Maple', 'Granite', 'Lakeside', 'Evergreen',
  'Northstar', 'Prairie', 'Copper', 'Willow', 'Bluebird', 'Ironwood', 'Silverline', 'Redwood', 'Sunrise', 'Keystone', 'Hilltop'];

const TARGET = {
  'HVAC Contractor': 'Heating & Air',
  'Plumbing Services': 'Plumbing',
  Landscaping: 'Lawn & Landscape',
  'Roofing Contractor': 'Roofing',
  'Pest Control': 'Pest Control',
  'Commercial Cleaning': 'Cleaning Co',
  'Dental Practice': 'Family Dental',
  'Accounting Firm': 'Accounting',
  'Insurance Agency': 'Insurance Group',
  'Auto Repair': 'Auto Care',
};
const OTHER = { 'Software Startup': 'Labs', Restaurant: 'Kitchen', 'Marketing Agency': 'Media', 'Fitness Studio': 'Fitness' };

const CITIES = [['Columbus', 'OH'], ['Dayton', 'OH'], ['Boise', 'ID'], ['Tulsa', 'OK'], ['Omaha', 'NE'], ['Madison', 'WI'],
  ['Knoxville', 'TN'], ['Spokane', 'WA'], ['Raleigh', 'NC'], ['Salem', 'OR'], ['Des Moines', 'IA'], ['Albany', 'NY'],
  ['Reno', 'NV'], ['Fort Wayne', 'IN'], ['Wichita', 'KS']];
const AREA = ['614', '937', '208', '918', '402', '608', '865', '509', '919', '503', '515', '518', '775', '260', '316'];
const FIRST = ['Sam', 'Dana', 'Chris', 'Jordan', 'Pat', 'Morgan', 'Taylor', 'Casey', 'Riley', 'Jamie', 'Alex', 'Robin'];
const LAST = ['Walker', 'Nguyen', 'Brooks', 'Patel', 'Rivera', 'Kowalski', 'Hughes', 'Dunn', 'Fischer', 'Okafor', 'Lindqvist', 'Moreno'];
const LEGAL = ['LLC', 'Inc.', 'Co.', ''];

const usedSlugs = new Set();
const usedPhones = new Set();

function makePhone(area) {
  for (;;) {
    const p = `(${area}) 555-01${String(between(0, 99)).padStart(2, '0')}`;
    if (!usedPhones.has(p)) { usedPhones.add(p); return p; }
  }
}

function makeBusiness(profile) {
  const industry = profile === 'poor' && chance(0.6)
    ? pick(Object.keys(OTHER))
    : pick(Object.keys(TARGET));
  const noun = TARGET[industry] ?? OTHER[industry];

  let name; let slug;
  do {
    name = `${pick(ADJECTIVES)} ${pick(ADJECTIVES)} ${noun}`;
    slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  } while (usedSlugs.has(slug));
  usedSlugs.add(slug);

  const [city, state] = pick(CITIES);
  const area = AREA[CITIES.findIndex(([c]) => c === city)];
  const first = pick(FIRST); const last = pick(LAST);

  let employees; let revenue; let founded; let ownerAge; let rating; let reviews;
  if (profile === 'ideal') {
    employees = between(8, 45); revenue = between(12, 80) * 100_000; founded = between(1985, 2012);
    ownerAge = between(58, 72); rating = (between(43, 49) / 10); reviews = between(30, 300);
  } else if (profile === 'ok') {
    employees = between(3, 90); revenue = between(4, 150) * 100_000; founded = between(1995, 2020);
    ownerAge = between(42, 66); rating = (between(36, 48) / 10); reviews = between(8, 150);
  } else {
    employees = pick([1, 2, 3, 120, 250, 400]); revenue = pick([150_000, 300_000, 25_000_000, 60_000_000]);
    founded = between(2018, 2025); ownerAge = between(27, 45); rating = (between(28, 40) / 10); reviews = between(1, 20);
  }

  const domain = `${slug}.example`;
  let email = '';
  const e = rand();
  if (e < 0.45) email = `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;
  else if (e < 0.75) email = `info@${domain}`;
  else if (e < 0.85) email = '';
  else email = pick(['not provided', `owner@@${domain}`, `owner@${slug}`, 'no-email']);

  return {
    name: `${name}${chance(0.6) ? ` ${pick(LEGAL)}` : ''}`.trim(),
    industry, city, state,
    website: chance(0.9) ? `https://www.${domain}` : '',
    email,
    phone: chance(0.9) ? makePhone(area) : '',
    employees, revenue, founded, ownerAge, rating, reviews,
    owner: `${first} ${last}`,
    domain,
  };
}

// Blank out some facts to mimic real, incomplete data.
function withGaps(b) {
  const out = { ...b };
  for (const f of ['employees', 'revenue', 'founded', 'ownerAge', 'owner']) if (chance(0.15)) out[f] = '';
  if (chance(0.15)) { out.rating = ''; out.reviews = ''; }
  return out;
}

const formatRevenue = (n) => {
  if (n === '') return '';
  const style = rand();
  if (style < 0.4) return String(n);
  if (style < 0.8) return `$${(n / 1e6).toFixed(1)}M`;
  return `${Math.round(n / 1e3)}k`;
};
const formatEmployees = (n) => (n !== '' && chance(0.2) ? `${Math.max(1, n - 4)}-${n + 4}` : n);

const base = [];
for (let i = 0; i < 22; i += 1) base.push(withGaps(makeBusiness('ideal')));
for (let i = 0; i < 24; i += 1) base.push(withGaps(makeBusiness('ok')));
for (let i = 0; i < 14; i += 1) base.push(withGaps(makeBusiness('poor')));

// Duplicates: same business, different formatting, some fields missing.
const dupes = [];
for (let i = 0; i < 12; i += 1) {
  const b = { ...pick(base) };
  const kind = i % 4;
  if (kind === 0) b.name = b.name.replace(/(LLC|Inc\.|Co\.)$/, '').trim() + (chance(0.5) ? ', LLC' : '');
  if (kind === 1) b.website = b.website ? b.website.replace('https://www.', 'http://') + '/' : '';
  if (kind === 2) { b.employees = ''; b.revenue = ''; b.ownerAge = ''; b.name = b.name.toUpperCase(); }
  if (kind === 3) { b.website = ''; b.city = b.city.toLowerCase(); }
  dupes.push(b);
}

const rows = [...base, ...dupes];
rows.push({ city: 'Columbus', state: 'OH' }); // unusable row: no name or website

for (let i = rows.length - 1; i > 0; i -= 1) {
  const j = Math.floor(rand() * (i + 1));
  [rows[i], rows[j]] = [rows[j], rows[i]];
}

const HEADER = ['Business Name', 'Industry', 'City', 'State', 'Website', 'Email', 'Phone', 'Employees', 'Founded',
  'Annual Revenue', 'Owner Name', 'Owner Age', 'Google Rating', 'Review Count'];

const esc = (v) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const lines = [HEADER.join(',')];
for (const r of rows) {
  lines.push([
    r.name, r.industry, r.city, r.state, r.website, r.email, r.phone,
    formatEmployees(r.employees ?? ''), r.founded, formatRevenue(r.revenue ?? ''),
    r.owner, r.ownerAge, r.rating, r.reviews,
  ].map(esc).join(','));
}

const csv = `${lines.join('\n')}\n`;
mkdirSync(resolve(root, 'sample-data'), { recursive: true });
mkdirSync(resolve(root, 'client/public'), { recursive: true });
writeFileSync(resolve(root, 'sample-data/synthetic_leads.csv'), csv);
writeFileSync(resolve(root, 'client/public/sample_leads.csv'), csv);
console.log(`Wrote ${rows.length} synthetic rows.`);
