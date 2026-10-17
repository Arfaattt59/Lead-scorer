import { Fragment, useMemo, useState } from 'react';

const EMAIL_LABEL = {
  verified: 'Verified',
  valid: 'Looks valid',
  unverified: 'Unverified',
  'no-mail-server': 'No mail server',
  invalid: 'Invalid',
  missing: 'Missing',
};
const BAD_EMAIL = ['invalid', 'no-mail-server', 'missing'];

const location = (l) => [l.city, l.state].filter(Boolean).join(', ') || '—';

function Details({ lead }) {
  const facts = [
    ['Owner', lead.ownerName],
    ['Phone', lead.phone],
    ['Website', lead.website],
    ['Email', lead.email],
  ].filter(([, v]) => v);

  return (
    <div className="details">
      <ul className="reasons">
        {lead.reasons.map((r) => (
          <li key={r.factor}>
            <span className="r-factor">{r.factor}</span>
            <span className="r-points">{r.points}/{r.max}</span>
            <span className="r-note">{r.note}</span>
          </li>
        ))}
      </ul>
      <div className="facts">
        {facts.map(([k, v]) => <div key={k}><span>{k}</span> {v}</div>)}
        {lead.duplicates > 0 && <div className="merged">Merged {lead.duplicates} duplicate {lead.duplicates === 1 ? 'row' : 'rows'}</div>}
      </div>
    </div>
  );
}

export default function ResultsTable({ leads, onExport, exporting }) {
  const [tier, setTier] = useState('all');
  const [query, setQuery] = useState('');
  const [hideBadEmail, setHideBadEmail] = useState(false);
  const [open, setOpen] = useState(() => new Set());

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => (
      (tier === 'all' || l.tier === tier)
      && (!hideBadEmail || !BAD_EMAIL.includes(l.emailStatus))
      && (!q || [l.name, l.industry, l.city, l.state, l.ownerName].some((v) => v && v.toLowerCase().includes(q)))
    ));
  }, [leads, tier, query, hideBadEmail]);

  const toggle = (rank) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(rank)) next.delete(rank); else next.add(rank);
    return next;
  });

  return (
    <section className="card results">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Filter by tier">
          {['all', 'A', 'B', 'C'].map((t) => (
            <button key={t} type="button" className={tier === t ? 'on' : ''} onClick={() => setTier(t)}>
              {t === 'all' ? 'All' : `Tier ${t}`}
            </button>
          ))}
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search name, industry, city, owner"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search leads"
        />
        <label className="check">
          <input type="checkbox" checked={hideBadEmail} onChange={(e) => setHideBadEmail(e.target.checked)} />
          Hide leads with bad or missing email
        </label>
        <button type="button" className="btn primary" disabled={visible.length === 0 || exporting} onClick={() => onExport(visible)}>
          {exporting ? 'Exporting…' : `Export ${visible.length} to CSV`}
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Business</th><th>Industry</th><th>Location</th>
              <th>Score</th><th>Tier</th><th>Email</th><th>Data</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((l) => {
              const isOpen = open.has(l.rank);
              return (
                <Fragment key={l.rank}>
                  <tr
                    className={`lead ${isOpen ? 'open' : ''}`}
                    onClick={() => toggle(l.rank)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(l.rank); } }}
                    tabIndex={0}
                    aria-expanded={isOpen}
                  >
                    <td className="num">{l.rank}</td>
                    <td className="name">{l.name}</td>
                    <td>{l.industry ?? '—'}</td>
                    <td>{location(l)}</td>
                    <td>
                      <div className="score">
                        <div className="bar"><span style={{ width: `${l.score}%` }} /></div>
                        <b>{l.score}</b>
                      </div>
                    </td>
                    <td><span className={`pill tier-${l.tier}`}>{l.tier}</span></td>
                    <td className={BAD_EMAIL.includes(l.emailStatus) ? 'bad' : ''}>
                      {EMAIL_LABEL[l.emailStatus] ?? '—'}{l.emailRole ? ' (generic)' : ''}
                    </td>
                    <td>{l.confidence}</td>
                  </tr>
                  {isOpen && (
                    <tr className="detail-row"><td colSpan={8}><Details lead={l} /></td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && <p className="empty">No leads match these filters.</p>}
      </div>
      <p className="hint foot">Click a row to see why it scored the way it did.</p>
    </section>
  );
}
