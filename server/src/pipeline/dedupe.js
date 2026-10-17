// Duplicate removal. Two rows are the same business if they share ANY of:
// website domain, email, phone (last 10 digits), or normalised name + city.
// Missing fields on the kept row are filled in from the duplicate.

const FILL_FIELDS = [
  'industry', 'city', 'state', 'website', 'domain', 'email', 'phone', 'employees',
  'yearsInBusiness', 'revenue', 'ownerName', 'ownerAge', 'rating', 'reviews',
];

const isBlank = (v) => v === null || v === undefined || v === '';

function keysFor(lead) {
  const keys = [];
  if (lead.domain) keys.push(`d:${lead.domain}`);
  if (lead.email) keys.push(`e:${lead.email}`);
  const digits = (lead.phone ?? '').replace(/\D/g, '');
  if (digits.length >= 10) keys.push(`p:${digits.slice(-10)}`);
  if (lead.nameKey && lead.city) keys.push(`n:${lead.nameKey}|${lead.city.toLowerCase()}`);
  return keys;
}

export function dedupe(rows) {
  const index = new Map(); // key -> position in `leads`
  const leads = [];
  let duplicatesRemoved = 0;

  const register = (lead, position) => {
    for (const k of keysFor(lead)) if (!index.has(k)) index.set(k, position);
  };

  for (const row of rows) {
    const match = keysFor(row).find((k) => index.has(k));

    if (match === undefined) {
      leads.push({ ...row, duplicates: 0, sourceRows: [row.sourceRow] });
      register(row, leads.length - 1);
      continue;
    }

    const position = index.get(match);
    const kept = leads[position];
    for (const f of FILL_FIELDS) {
      if (isBlank(kept[f]) && !isBlank(row[f])) kept[f] = row[f];
    }
    kept.duplicates += 1;
    kept.sourceRows.push(row.sourceRow);
    duplicatesRemoved += 1;
    register(kept, position); // the filled-in fields may unlock new keys
  }

  return { leads, duplicatesRemoved };
}
