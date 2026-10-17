import { randomUUID } from 'node:crypto';

// Fallback store used when MONGODB_URI is not set. Data is lost on restart.
export function createMemoryStore({ maxRuns = 50 } = {}) {
  const runs = new Map();

  return {
    kind: 'memory',
    async saveRun(run) {
      const id = randomUUID();
      runs.set(id, { id, createdAt: new Date().toISOString(), ...run });
      if (runs.size > maxRuns) runs.delete(runs.keys().next().value);
      return { id };
    },
    async getRun(id) {
      return runs.get(id) ?? null;
    },
    async listRuns(limit = 20) {
      return [...runs.values()]
        .reverse()
        .slice(0, limit)
        .map(({ id, createdAt, summary, icp }) => ({ id, createdAt, summary, icp }));
    },
  };
}
