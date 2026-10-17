function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Summary({ summary }) {
  return (
    <>
      <div className="stats">
        <Stat label="Rows received" value={summary.received} />
        <Stat label="Duplicates merged" value={summary.duplicatesRemoved} />
        <Stat label="Leads ranked" value={summary.ranked ?? summary.uniqueLeads} />
        <Stat label="Tier A leads" value={summary.tiers.A} tone="good" />
        <Stat label="Bad or missing emails" value={summary.invalidEmails + summary.missingEmails} tone="warn" />
        <Stat label="Average score" value={summary.averageScore} />
      </div>
      {summary.excludedByIndustry > 0 && (
        <p className="note">{summary.excludedByIndustry} leads were left out because their industry is not in your target list.</p>
      )}
      {summary.skipped > 0 && (
        <p className="note">
          {summary.skipped} {summary.skipped === 1 ? 'row was' : 'rows were'} skipped because they had no business name or website.
        </p>
      )}
    </>
  );
}
