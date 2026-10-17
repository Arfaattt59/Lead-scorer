// Small CSV parser (quoted fields, escaped quotes, CRLF, BOM, blank lines).
// Returns { columns, rows } where each row is an object keyed by column name.

export function parseCsv(text) {
  const src = String(text).replace(/^﻿/, '');
  const table = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      table.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); table.push(row); }

  const lines = table.filter((r) => r.some((v) => v.trim() !== ''));
  if (lines.length === 0) return { columns: [], rows: [] };

  const columns = lines[0].map((h) => h.trim());
  const rows = lines.slice(1).map((r) =>
    Object.fromEntries(columns.map((name, i) => [name, (r[i] ?? '').trim()])));
  return { columns, rows };
}

export const MAX_ROWS = 5000; // same limit as the server

// A leads file needs at least a business name or a website column.
export function looksLikeLeads(columns) {
  return columns.some((c) => /name|company|business|website|domain|url/i.test(c));
}
