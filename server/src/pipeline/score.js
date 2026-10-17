// Explainable acquisition-fit score (0-100).
// Every factor returns points and a plain-English note, so you can see why a lead
// ranked where it did. A fact we don't have earns 1 point (a running business has
// some of everything), a fact that is known and clearly off-target earns 0, and
// the "confidence" label drops. Nothing is ever removed for missing data.
//
//   Industry 15 | Team size 15 | Revenue 10 | Track record 10
//   Succession 20 | Reputation 10 | Reachability 20   = 100

const inRange = (v, r) => v >= r.min && v <= r.max;
const nearRange = (v, r, tolerance = 0.5) => v >= r.min * (1 - tolerance) && v <= r.max * (1 + tolerance);

const money = (n) => {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${n}`;
};

/** Returns the target industry a lead's industry matches, or null. */
export function matchIndustry(industry, targets) {
  const text = String(industry ?? '').toLowerCase();
  if (!text) return null;
  return targets.find((t) => text.includes(t)) ?? null;
}

const BLANK_LEAD = {
  industry: null, employees: null, revenue: null, yearsInBusiness: null, ownerAge: null,
  rating: null, reviews: null, ownerName: null, phone: null, website: null, emailStatus: null,
};

export function scoreLead(input, icp) {
  // Treat undefined like null so partially filled leads never produce "undefined" notes.
  const lead = { ...BLANK_LEAD, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) };
  const reasons = [];
  const add = (factor, points, max, note) => reasons.push({ factor, points, max, note });

  // 1. Industry fit (15)
  const industry = (lead.industry ?? '').toLowerCase();
  if (icp.targetIndustries.length === 0) {
    add('Industry fit', 8, 15, 'No target industries set, so industry is neutral');
  } else if (!industry) {
    add('Industry fit', 1, 15, 'Industry unknown');
  } else {
    const hit = matchIndustry(industry, icp.targetIndustries);
    if (hit) add('Industry fit', 15, 15, `Matches target industry "${hit}"`);
    else add('Industry fit', 0, 15, `"${lead.industry}" is outside the target industries`);
  }

  // 2. Employees (15)
  const e = lead.employees;
  const eRange = `${icp.employees.min}-${icp.employees.max}`;
  if (e === null) add('Team size', 1, 15, 'Employee count unknown');
  else if (inRange(e, icp.employees)) add('Team size', 15, 15, `${e} employees, inside the ${eRange} target`);
  else if (nearRange(e, icp.employees)) add('Team size', 8, 15, `${e} employees, close to the ${eRange} target`);
  else add('Team size', 0, 15, `${e} employees, far from the ${eRange} target`);

  // 3. Revenue (10)
  const r = lead.revenue;
  const rRange = `${money(icp.revenue.min)}-${money(icp.revenue.max)}`;
  if (r === null) add('Revenue', 1, 10, 'Revenue unknown');
  else if (inRange(r, icp.revenue)) add('Revenue', 10, 10, `${money(r)} revenue, inside the ${rRange} target`);
  else if (nearRange(r, icp.revenue)) add('Revenue', 5, 10, `${money(r)} revenue, close to the ${rRange} target`);
  else add('Revenue', 0, 10, `${money(r)} revenue, far from the ${rRange} target`);

  // 4. Maturity (10)
  const y = lead.yearsInBusiness;
  const minY = icp.minYearsInBusiness;
  if (y === null) add('Track record', 1, 10, 'Years in business unknown');
  else if (y >= minY) add('Track record', 10, 10, `${y} years in business`);
  else if (y >= minY / 2) add('Track record', 5, 10, `${y} years in business, a bit young`);
  else add('Track record', 0, 10, `Only ${y} years in business`);

  // 5. Succession signal (20): older owners are more likely to sell.
  const age = lead.ownerAge;
  const sAge = icp.successionAge;
  if (age === null) add('Succession signal', 1, 20, 'Owner age unknown');
  else if (age >= sAge) add('Succession signal', 20, 20, `Owner is ${age}, at or past typical succession age`);
  else if (age >= sAge - 5) add('Succession signal', 14, 20, `Owner is ${age}, approaching succession age`);
  else if (age >= sAge - 10) add('Succession signal', 8, 20, `Owner is ${age}, some years from succession age`);
  else add('Succession signal', 2, 20, `Owner is ${age}, unlikely to sell soon`);

  // 6. Reputation (10)
  const { rating, reviews } = lead;
  if (rating === null) add('Reputation', 1, 10, 'No rating available');
  else if (rating >= 4.3 && (reviews ?? 0) >= 25) add('Reputation', 10, 10, `${rating} stars from ${reviews} reviews`);
  else if (rating >= 4.0) add('Reputation', 7, 10, `${rating} stars${reviews ? ` from ${reviews} reviews` : ''}`);
  else if (rating >= 3.5) add('Reputation', 4, 10, `${rating} stars, average`);
  else add('Reputation', 1, 10, `${rating} stars, weak reputation`);

  // 7. Reachability (20): can we actually contact the owner?
  const parts = [];
  let reach = 0;
  if (lead.ownerName) { reach += 5; parts.push('owner named'); } else parts.push('no owner name');
  if (lead.emailStatus === 'no-mail-server') { reach += 1; parts.push('email domain has no mail server'); }
  else if (['valid', 'verified', 'unverified'].includes(lead.emailStatus)) {
    reach += lead.emailRole ? 4 : 7;
    parts.push(lead.emailRole ? 'generic inbox' : lead.emailStatus === 'verified' ? 'verified email' : 'email present');
  } else {
    parts.push(lead.emailStatus === 'invalid' ? 'invalid email' : 'no email');
  }
  if (lead.phone) { reach += 4; parts.push('phone present'); } else parts.push('no phone');
  if (lead.website) { reach += 4; parts.push('website present'); } else parts.push('no website');
  add('Reachability', reach, 20, parts.join(', '));

  const score = Math.round(reasons.reduce((sum, x) => sum + x.points, 0));
  const tier = score >= icp.tiers.A ? 'A' : score >= icp.tiers.B ? 'B' : 'C';

  // Confidence = how many of the key facts we actually know.
  const known = [lead.industry, lead.employees, lead.revenue, lead.yearsInBusiness, lead.ownerAge, lead.rating]
    .filter((v) => v !== null && v !== undefined).length;
  const confidence = known >= 5 ? 'High' : known >= 3 ? 'Medium' : 'Low';

  return { score, tier, confidence, reasons };
}
