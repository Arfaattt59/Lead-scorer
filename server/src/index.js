import 'dotenv/config';
import { createApp } from './app.js';
import { createStore } from './store/index.js';

const store = await createStore(process.env.MONGODB_URI);
const app = createApp({ store });
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`API listening on port ${port} (store: ${store.kind})`);
});
