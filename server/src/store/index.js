import { createMemoryStore } from './memory.js';

/** Use MongoDB when MONGODB_URI is set; otherwise keep runs in memory. */
export async function createStore(mongoUri) {
  if (!mongoUri) return createMemoryStore();
  const { createMongoStore } = await import('./mongo.js');
  return createMongoStore(mongoUri);
}
