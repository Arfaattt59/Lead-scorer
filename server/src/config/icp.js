// Ideal Customer Profile (ICP) for an acquisition entrepreneur ("searcher").
// Every number here can be overridden from the UI.

export const DEFAULT_ICP = {
  targetIndustries: [
    'hvac',
    'plumbing',
    'landscaping',
    'roofing',
    'pest control',
    'cleaning',
    'dental',
    'accounting',
    'insurance',
    'auto repair',
  ],
  employees: { min: 5, max: 50 },
  revenue: { min: 1_000_000, max: 10_000_000 },
  minYearsInBusiness: 10,
  successionAge: 60,
  tiers: { A: 80, B: 60 },
  mustMatchIndustry: false,
};

const num = (v, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  if (v === '' || v === null || v === undefined) return fallback; // an emptied form field is not 0
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

const range = (input, fallback) => {
  const min = num(input?.min, fallback.min);
  const max = num(input?.max, fallback.max);
  return min <= max ? { min, max } : { ...fallback };
};

/** Merge user input into the defaults, ignoring anything invalid. */
export function mergeIcp(input = {}) {
  const industries = Array.isArray(input?.targetIndustries)
    ? input.targetIndustries
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 50)
    : DEFAULT_ICP.targetIndustries;

  const a = num(input?.tiers?.A, DEFAULT_ICP.tiers.A, { max: 100 });
  const b = num(input?.tiers?.B, DEFAULT_ICP.tiers.B, { max: 100 });

  return {
    targetIndustries: industries,
    employees: range(input?.employees, DEFAULT_ICP.employees),
    revenue: range(input?.revenue, DEFAULT_ICP.revenue),
    minYearsInBusiness: num(input?.minYearsInBusiness, DEFAULT_ICP.minYearsInBusiness, { max: 200 }),
    successionAge: num(input?.successionAge, DEFAULT_ICP.successionAge, { min: 30, max: 100 }),
    tiers: a >= b ? { A: a, B: b } : { ...DEFAULT_ICP.tiers },
    mustMatchIndustry: input?.mustMatchIndustry === true,
  };
}
