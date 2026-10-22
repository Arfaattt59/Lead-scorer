import { useState } from 'react';

const toNumber = (value) => (value === '' ? '' : Number(value));

function NumberField({ label, value, onChange, step = 1, min = 0, max }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="number" value={value} step={step} min={min} max={max} onChange={(e) => onChange(toNumber(e.target.value))} />
    </label>
  );
}

export default function IcpForm({ icp, onChange, onReset }) {
  const [industries, setIndustries] = useState(icp.targetIndustries.join(', '));
  const set = (patch) => onChange({ ...icp, ...patch });

  return (
    <section className="card" id="step-target">
      <h2><span className="step">2</span> Describe your ideal target</h2>
      <p className="hint">Leads are scored against this profile. Change it to match what you are looking to buy.</p>

      <label className="field wide">
        <span>Target industries (comma separated)</span>
        <textarea
          rows={3}
          value={industries}
          onChange={(e) => {
            setIndustries(e.target.value);
            set({ targetIndustries: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) });
          }}
        />
      </label>
      <label className="check wide">
        <input type="checkbox" checked={icp.mustMatchIndustry} onChange={(e) => set({ mustMatchIndustry: e.target.checked })} />
        <span>Only keep leads in these industries. Leads with no industry are dropped too.</span>
      </label>

      <div className="grid2">
        <NumberField label="Min employees" value={icp.employees.min} onChange={(v) => set({ employees: { ...icp.employees, min: v } })} />
        <NumberField label="Max employees" value={icp.employees.max} onChange={(v) => set({ employees: { ...icp.employees, max: v } })} />
        <NumberField label="Min revenue ($)" step={100000} value={icp.revenue.min} onChange={(v) => set({ revenue: { ...icp.revenue, min: v } })} />
        <NumberField label="Max revenue ($)" step={100000} value={icp.revenue.max} onChange={(v) => set({ revenue: { ...icp.revenue, max: v } })} />
        <NumberField label="Min years in business" value={icp.minYearsInBusiness} onChange={(v) => set({ minYearsInBusiness: v })} />
        <NumberField label="Succession age (owner)" min={30} max={100} value={icp.successionAge} onChange={(v) => set({ successionAge: v })} />
        <NumberField label="Tier A starts at" max={100} value={icp.tiers.A} onChange={(v) => set({ tiers: { ...icp.tiers, A: v } })} />
        <NumberField label="Tier B starts at" max={100} value={icp.tiers.B} onChange={(v) => set({ tiers: { ...icp.tiers, B: v } })} />
      </div>

      <button type="button" className="btn link" onClick={onReset}>Reset to defaults</button>
    </section>
  );
}
