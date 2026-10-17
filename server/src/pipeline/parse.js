/**
 * Parse messy numeric cells: "12", "$2.4M", "950k", "1,200,000", "50+", "10-20".
 * Returns null when the value is blank or cannot be understood.
 */
export function parseNumber(value, { allowRange = false } = {}) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const s = String(value).trim().toLowerCase().replace(/[$,\s+]/g, '');
  if (!s || ['n/a', 'na', '-', 'unknown', 'null'].includes(s)) return null;

  if (allowRange) {
    const r = s.match(/^(\d+(?:\.\d+)?)(?:-|–|to)(\d+(?:\.\d+)?)$/);
    if (r) return (Number(r[1]) + Number(r[2])) / 2;
  }

  const m = s.match(/^(\d+(?:\.\d+)?)([kmb])?$/);
  if (!m) return null;
  const multiplier = { k: 1e3, m: 1e6, b: 1e9 }[m[2]] ?? 1;
  return Number((Number(m[1]) * multiplier).toFixed(4));
}
