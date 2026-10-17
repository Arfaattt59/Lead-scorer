// CSV export. Cells that start with = + - @ are prefixed with an apostrophe so
// Excel/Sheets can't run them as formulas (CSV injection).

const cell = (value) => {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const COLUMNS = [
  ['rank', (l) => l.rank],
  ['tier', (l) => l.tier],
  ['score', (l) => l.score],
  ['confidence', (l) => l.confidence],
  ['business_name', (l) => l.name],
  ['industry', (l) => l.industry],
  ['city', (l) => l.city],
  ['state', (l) => l.state],
  ['website', (l) => l.website],
  ['email', (l) => l.email],
  ['email_status', (l) => l.emailStatus],
  ['phone', (l) => l.phone],
  ['owner_name', (l) => l.ownerName],
  ['employees', (l) => l.employees],
  ['annual_revenue', (l) => l.revenue],
  ['years_in_business', (l) => l.yearsInBusiness],
  ['owner_age', (l) => l.ownerAge],
  ['rating', (l) => l.rating],
  ['reviews', (l) => l.reviews],
  ['strengths', (l) => (l.reasons ?? []).filter((r) => r.points / r.max >= 0.7).map((r) => r.note).join('; ')],
  ['gaps', (l) => (l.reasons ?? []).filter((r) => r.points / r.max < 0.4).map((r) => r.note).join('; ')],
];

export function toCsv(leads) {
  const header = COLUMNS.map(([name]) => name).join(',');
  const lines = leads.map((lead) => COLUMNS.map(([, get]) => cell(get(lead))).join(','));
  return [header, ...lines].join('\n');
}
