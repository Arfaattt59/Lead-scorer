import express from 'express';
import cors from 'cors';
import { createHandlers } from './handlers.js';
import { MxChecker } from './pipeline/validate.js';
import { createMemoryStore } from './store/memory.js';

// Express only does HTTP plumbing; the real logic lives in handlers.js.
export function createApp({
  store = createMemoryStore(),
  mxChecker = new MxChecker(),
  nowYear = new Date().getFullYear(),
  corsOrigin = process.env.CORS_ORIGIN,
} = {}) {
  const handlers = createHandlers({ store, mxChecker, nowYear });
  const app = express();

  app.use(cors({ origin: corsOrigin ? corsOrigin.split(',').map((s) => s.trim()) : true }));
  app.use(express.json({ limit: '5mb' }));

  const send = (res, result) => {
    if (result.csv !== undefined) {
      return res.status(result.status).type('text/csv').attachment(result.filename).send(result.csv);
    }
    return res.status(result.status).json(result.json);
  };
  const route = (fn) => (req, res, next) => Promise.resolve(fn(req)).then((r) => send(res, r)).catch(next);

  app.get('/api/health', route(() => handlers.health()));
  app.get('/api/config/defaults', route(() => handlers.defaults()));
  app.post('/api/score', route((req) => handlers.score(req.body)));
  app.post('/api/export', route((req) => handlers.exportCsv(req.body)));
  app.get('/api/runs', route(() => handlers.listRuns()));
  app.get('/api/runs/:id', route((req) => handlers.getRun(req.params.id)));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'File is too large.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}
