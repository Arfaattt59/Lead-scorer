// Times the pipeline on synthetic rows so any speed claim can be reproduced.
// Usage: npm run bench [rows]   (default 5000, the API's per-request limit)

import { runPipeline } from '../src/pipeline/index.js';
import { DEFAULT_ICP } from '../src/config/icp.js';

const N = Number(process.argv[2]) || 5000;
const INDUSTRIES = ['HVAC Contractor', 'Plumbing Services', 'Landscaping', 'Dental Practice', 'Restaurant', 'Software Startup'];

const rows = Array.from({ length: N }, (_, i) => {
  const id = i % Math.ceil(N * 0.9); // about 10% of rows repeat an earlier business
  return {
    'Business Name': `Company ${id} LLC`,
    Industry: INDUSTRIES[id % INDUSTRIES.length],
    City: `City ${id % 40}`,
    Website: `https://company${id}.example`,
    Email: `owner@company${id}.example`,
    Phone: `555${String(id).padStart(7, '0')}`,
    Employees: 3 + (id % 80),
    Founded: 1975 + (id % 50),
    'Annual Revenue': 200_000 + (id % 90) * 100_000,
    'Owner Age': 35 + (id % 40),
    'Google Rating': (30 + (id % 20)) / 10,
    'Review Count': id % 300,
  };
});

const start = performance.now();
const { summary } = await runPipeline(rows, { icp: DEFAULT_ICP, nowYear: 2026 });
const ms = performance.now() - start;

console.log(`${N} rows -> ${summary.uniqueLeads} unique leads (${summary.duplicatesRemoved} duplicates merged)`);
console.log(`${ms.toFixed(0)} ms (${Math.round(N / (ms / 1000))} rows/second), no DNS lookups, memory store`);
