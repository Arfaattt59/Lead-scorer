// In development Vite proxies /api to the Express server. In production, set
// VITE_API_URL to wherever the API is hosted.
const BASE = import.meta.env.VITE_API_URL ?? '';

async function request(path, options) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, options);
  } catch {
    throw new Error('Could not reach the server. Is the API running?');
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch { /* keep the default message */ }
    throw new Error(message);
  }
  return res;
}

const jsonPost = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const getDefaults = async () => (await request('/api/config/defaults')).json();
export const scoreLeads = async (payload) => (await request('/api/score', jsonPost(payload))).json();
export const exportCsv = async (leads) => (await request('/api/export', jsonPost({ leads }))).blob();
export const listRuns = async () => (await request('/api/runs')).json();
export const getRun = async (id) => (await request(`/api/runs/${encodeURIComponent(id)}`)).json();
