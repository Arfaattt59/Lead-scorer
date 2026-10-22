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

const PAGE = 50;
const SORTS = {
  rank: (a, b) => a.rank - b.rank,
  name: (a, b) => a.name.localeCompare(b.name),
  score: (a, b) => a.score - b.score,
  tier: (a, b) => a.tier.localeCompare(b.tier) || a.rank - b.rank,
};

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
  const [sort, setSort] = useState({ key: 'rank', dir: 'asc' });
  const [limit, setLimit] = useState(PAGE);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => (
      (tier === 'all' || l.tier === tier)
      && (!hideBadEmail || !BAD_EMAIL.includes(l.emailStatus))
      && (!q || [l.name, l.industry, l.city, l.state, l.ownerName].some((v) => v && v.toLowerCase().includes(q)))
    ));
  }, [leads, tier, query, hideBadEmail]);

  const sorted = useMemo(() => {
    const list = [...visible].sort(SORTS[sort.key]);
    return sort.dir === 'desc' ? list.reverse() : list;
  }, [visible, sort]);
  const shown = sorted.slice(0, limit);

  const sortBy = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'score' ? 'desc' : 'asc' }));
  const ariaSort = (key) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  const sortTh = (k, label) => (
    <th aria-sort={ariaSort(k)}>
      <button type="button" className="th-sort" onClick={() => sortBy(k)}>{label}<span aria-hidden="true">{sort.key === k ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</span></button>
    </th>
  );

  const toggle = (rank) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(rank)) next.delete(rank); else next.add(rank);
    return next;
  });

  return (
    <section className="card results">
      <div className="toolbar">
        <p className="count" aria-live="polite">Showing <b>{visible.length}</b> of {leads.length}</p>
        <div className="seg" role="group" aria-label="Filter by tier">
          {['all', 'A', 'B', 'C'].map((t) => (
            <button key={t} type="button" className={tier === t ? 'on' : ''} onClick={() => { setTier(t); setLimit(PAGE); }}>
              {t === 'all' ? 'All' : `Tier ${t}`}
            </button>
          ))}
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search name, industry, city, owner"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
          aria-label="Search leads"
        />
        <label className="check">
          <input type="checkbox" checked={hideBadEmail} onChange={(e) => { setHideBadEmail(e.target.checked); setLimit(PAGE); }} />
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
              {sortTh('rank', '#')}{sortTh('name', 'Business')}<th className="col-sec">Industry</th><th className="col-sec">Location</th>
              {sortTh('score', 'Score')}{sortTh('tier', 'Tier')}<th className="col-mid">Email</th><th className="col-sec">Data</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l) => {
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
                    <td className="name">{l.name}<div className="sub">{[l.industry, location(l) === '—' ? null : location(l)].filter(Boolean).join(' · ')}</div></td>
                    <td className="col-sec">{l.industry ?? '—'}</td>
                    <td className="col-sec">{location(l)}</td>
                    <td>
                      <div className="score">
                        <div className="bar"><span style={{ width: `${l.score}%` }} /></div>
                        <b>{l.score}</b>
                      </div>
                    </td>
                    <td><span className={`pill tier-${l.tier}`}>{l.tier}</span></td>
                    <td className={`col-mid${BAD_EMAIL.includes(l.emailStatus) ? ' bad' : ''}`}>
                      {EMAIL_LABEL[l.emailStatus] ?? '—'}{l.emailRole ? ' (generic)' : ''}
                    </td>
                    <td className="col-sec">{l.confidence}</td>
                  </tr>
                  {isOpen && (
                    <tr className="detail-row"><td colSpan={8}><Details lead={l} /></td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="empty">
            <p>No leads match these filters.</p>
            <button type="button" className="btn" onClick={() => { setTier('all'); setQuery(''); setHideBadEmail(false); }}>Clear filters</button>
          </div>
        )}
      </div>
      {sorted.length > shown.length && (
        <div className="more">
          <button type="button" className="btn" onClick={() => setLimit((n) => n + PAGE)}>Show {Math.min(PAGE, sorted.length - shown.length)} more ({sorted.length - shown.length} left)</button>
        </div>
      )}
      <p className="hint foot">Click a row to see why it scored the way it did.</p>
    </section>
  );
}
