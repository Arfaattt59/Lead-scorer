import { normalizeRows } from './normalize.js';
import { dedupe } from './dedupe.js';
import { validateEmails } from './validate.js';
import { scoreLead, matchIndustry } from './score.js';

/**
 * raw rows -> normalise -> dedupe -> (optional industry filter) -> validate emails -> score -> rank
 */
export async function runPipeline(rawRows, { icp, mxChecker = null, nowYear } = {}) {
  const { rows, skipped } = normalizeRows(rawRows, nowYear);
  const { leads: unique, duplicatesRemoved } = dedupe(rows);

  // With "must match industry" on, leads outside the target industries (or with no
  // industry at all) are dropped before any email lookups are spent on them.
  const strict = icp.mustMatchIndustry && icp.targetIndustries.length > 0;
  const kept = strict ? unique.filter((l) => matchIndustry(l.industry, icp.targetIndustries)) : unique;
  const excludedByIndustry = unique.length - kept.length;

  await validateEmails(kept, mxChecker);

  const scored = kept
    .map((lead) => ({ ...lead, ...scoreLead(lead, icp) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((lead, i) => ({ ...lead, rank: i + 1 }));

  const tiers = { A: 0, B: 0, C: 0 };
  for (const lead of scored) tiers[lead.tier] += 1;

  const summary = {
    received: rawRows.length,
    skipped: skipped.length,
    duplicatesRemoved,
    uniqueLeads: unique.length,
    excludedByIndustry,
    ranked: scored.length,
    invalidEmails: scored.filter((l) => l.emailStatus === 'invalid' || l.emailStatus === 'no-mail-server').length,
    missingEmails: scored.filter((l) => l.emailStatus === 'missing').length,
    mxChecked: Boolean(mxChecker),
    tiers,
    averageScore: scored.length
      ? Math.round(scored.reduce((sum, l) => sum + l.score, 0) / scored.length)
      : 0,
  };

  return { summary, leads: scored, skipped };
}
