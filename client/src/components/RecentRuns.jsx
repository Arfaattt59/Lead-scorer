const when = (iso) => new Date(iso).toLocaleString([], {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

export default function RecentRuns({ runs, onOpen, disabled }) {
  if (runs.length === 0) return null;
  return (
    <section className="card">
      <h2>Recent runs</h2>
      <ul className="runs">
        {runs.slice(0, 5).map((run) => (
          <li key={run.id}>
            <button type="button" className="run" onClick={() => onOpen(run.id)} disabled={disabled}>
              <span>{run.summary.ranked ?? run.summary.uniqueLeads} leads ranked</span>
              <span className="small muted">{when(run.createdAt)} · {run.summary.tiers.A} in tier A</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
