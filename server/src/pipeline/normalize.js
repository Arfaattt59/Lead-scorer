import { parseNumber } from './parse.js';

// Column names differ between lead sources, so we accept common aliases.
const ALIASES = {
  name: ['name', 'business name', 'business', 'company', 'company name'],
  industry: ['industry', 'category', 'sector', 'type'],
  city: ['city', 'town'],
  state: ['state', 'province', 'region'],
  website: ['website', 'url', 'site', 'domain', 'web'],
  email: ['email', 'e-mail', 'email address', 'contact email'],
  phone: ['phone', 'telephone', 'phone number', 'tel'],
  employees: ['employees', 'employee count', 'headcount', 'team size', '# employees'],
  founded: ['founded', 'year founded', 'established', 'year established'],
  yearsInBusiness: ['years in business', 'years'],
  revenue: ['revenue', 'annual revenue', 'estimated revenue', 'revenue estimate'],
  ownerName: ['owner', 'owner name', 'contact name', 'contact'],
  ownerAge: ['owner age', 'age of owner'],
  rating: ['rating', 'google rating', 'stars', 'avg rating'],
  reviews: ['reviews', 'review count', 'number of reviews'],
};

const HEADER_TO_FIELD = new Map();
for (const [field, names] of Object.entries(ALIASES)) {
  for (const n of names) HEADER_TO_FIELD.set(n, field);
}

const cleanHeader = (h) => String(h).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

const text = (v) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim());

/** "https://www.Example.com/about?x=1" -> "example.com" (or null). */
export function extractDomain(value) {
  let s = text(value).toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^www\./, '');
  s = s.split(/[/?#]/)[0].replace(/:\d+$/, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) ? s : null;
}

const SUFFIXES = /\b(llc|l l c|inc|incorporated|co|corp|corporation|company|ltd|limited|the)\b/g;

/** "Summit Ridge HVAC, LLC" and "summit ridge hvac inc." -> "summit ridge hvac". */
export function nameKey(name) {
  return text(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(SUFFIXES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const between = (n, lo, hi) => (n !== null && n >= lo && n <= hi ? n : null);

export function normalizeRow(raw, nowYear = new Date().getFullYear()) {
  const mapped = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    const field = HEADER_TO_FIELD.get(cleanHeader(key));
    if (field && mapped[field] === undefined && text(value) !== '') mapped[field] = value;
  }

  const website = text(mapped.website) || null;
  const domain = extractDomain(website);
  const name = text(mapped.name) || domain || '';

  let yearsInBusiness = parseNumber(mapped.yearsInBusiness);
  if (yearsInBusiness === null && mapped.founded !== undefined) {
    const founded = between(parseNumber(mapped.founded), 1800, nowYear);
    if (founded !== null) yearsInBusiness = nowYear - founded;
  }

  const phone = text(mapped.phone);
  const phoneDigits = phone.replace(/\D/g, '');

  return {
    name,
    nameKey: nameKey(name),
    industry: text(mapped.industry) || null,
    city: text(mapped.city) || null,
    state: text(mapped.state) || null,
    website,
    domain,
    email: text(mapped.email).toLowerCase() || null,
    phone: phoneDigits.length >= 10 && phoneDigits.length <= 15 ? phone : null,
    employees: between(parseNumber(mapped.employees, { allowRange: true }), 1, 1_000_000),
    yearsInBusiness: between(yearsInBusiness, 0, 300),
    revenue: between(parseNumber(mapped.revenue), 0, 1e12),
    ownerName: text(mapped.ownerName) || null,
    ownerAge: between(parseNumber(mapped.ownerAge), 18, 100),
    rating: between(parseNumber(mapped.rating), 0, 5),
    reviews: between(parseNumber(mapped.reviews), 0, 10_000_000),
  };
}

/** Normalise all rows. Rows with neither a name nor a website are skipped. */
export function normalizeRows(rawRows, nowYear) {
  const rows = [];
  const skipped = [];
  rawRows.forEach((raw, i) => {
    const row = normalizeRow(raw, nowYear);
    if (!row.name) {
      skipped.push({ row: i + 1, reason: 'Missing business name and website' });
      return;
    }
    rows.push({ ...row, sourceRow: i + 1 });
  });
  return { rows, skipped };
}
