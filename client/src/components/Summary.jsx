import { useResolvedTheme } from '../useTheme.js';
import SpotlightCard from './reactbits/SpotlightCard.jsx';
import useCountUp from './useCountUp.js';

function Stat({ label, value, tone, theme }) {
  const shown = useCountUp(value);
  const decimals = Number.isInteger(Number(value)) ? 0 : 1;
  return (
    <SpotlightCard className={`stat ${tone ?? ''}`} theme={theme} spotlightSize={150} intensity={0.2}>
      <div className="stat-value">{shown.toFixed(decimals)}</div>
      <div className="stat-label">{label}</div>
    </SpotlightCard>
  );
}

export default function Summary({ summary }) {
  const theme = useResolvedTheme();
  return (
    <>
      <div className="stats">
        <Stat theme={theme} label="Rows received" value={summary.received} />
        <Stat theme={theme} label="Duplicates merged" value={summary.duplicatesRemoved} />
        <Stat theme={theme} label="Leads ranked" value={summary.ranked ?? summary.uniqueLeads} />
        <Stat theme={theme} label="Tier A leads" value={summary.tiers.A} tone="good" />
        <Stat theme={theme} label="Bad or missing emails" value={summary.invalidEmails + summary.missingEmails} tone="warn" />
        <Stat theme={theme} label="Average score" value={summary.averageScore} />
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
