// Framework-independent request handlers. Each one takes plain data and returns
// { status, json } or { status, csv, filename }. Express (app.js) only does the
// HTTP plumbing, which keeps this logic easy to test.

import { DEFAULT_ICP, mergeIcp } from './config/icp.js';
import { runPipeline } from './pipeline/index.js';
import { toCsv } from './pipeline/csv.js';

export const MAX_ROWS = 5000;

const bad = (message) => ({ status: 400, json: { error: message } });

function checkLeads(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return 'Body must include a non-empty "leads" array.';
  if (leads.length > MAX_ROWS) return `Too many rows (${leads.length}). The limit is ${MAX_ROWS} per request.`;
  if (leads.some((r) => r === null || typeof r !== 'object' || Array.isArray(r))) {
    return 'Every lead must be an object of column -> value.';
  }
  return null;
}

export function createHandlers({ store, mxChecker, nowYear = new Date().getFullYear() }) {
  return {
    async health() {
      return { status: 200, json: { ok: true, store: store.kind } };
    },

    async defaults() {
      return { status: 200, json: DEFAULT_ICP };
    },

    async score(body) {
      const { leads, icp, checkMx = false, save = true } = body ?? {};
      const problem = checkLeads(leads);
      if (problem) return bad(problem);

      const mergedIcp = mergeIcp(icp);
      const result = await runPipeline(leads, {
        icp: mergedIcp,
        mxChecker: checkMx ? mxChecker : null,
        nowYear,
      });

      let runId = null;
      if (save) {
        try {
          runId = (await store.saveRun({ icp: mergedIcp, summary: result.summary, leads: result.leads })).id;
        } catch (err) {
          // A storage problem should not lose the user's results.
          console.error('Could not save run:', err.message);
        }
      }
      return { status: 200, json: { runId, icp: mergedIcp, ...result } };
    },

    async exportCsv(body) {
      const { leads } = body ?? {};
      if (!Array.isArray(leads)) return bad('Body must include a "leads" array.');
      return { status: 200, csv: toCsv(leads), filename: 'scored_leads.csv' };
    },

    async listRuns() {
      return { status: 200, json: await store.listRuns() };
    },

    async getRun(id) {
      const run = await store.getRun(id);
      return run ? { status: 200, json: run } : { status: 404, json: { error: 'Run not found.' } };
    },
  };
}
