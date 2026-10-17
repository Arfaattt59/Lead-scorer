import { useEffect, useState } from 'react';
import { getDefaults, scoreLeads, exportCsv, listRuns, getRun } from './api.js';
import UploadCard from './components/UploadCard.jsx';
import IcpForm from './components/IcpForm.jsx';
import Summary from './components/Summary.jsx';
import ResultsTable from './components/ResultsTable.jsx';
import ResultsSkeleton from './components/ResultsSkeleton.jsx';
import RecentRuns from './components/RecentRuns.jsx';
import './styles.css';

export default function App() {
  const [defaults, setDefaults] = useState(null);
  const [icp, setIcp] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [file, setFile] = useState(null);
  const [checkMx, setCheckMx] = useState(false);
  const [result, setResult] = useState(null);
  const [runCount, setRunCount] = useState(0);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const refreshRuns = () => listRuns().then(setRuns).catch(() => {});

  useEffect(() => {
    refreshRuns();
    getDefaults()
      .then((d) => { setDefaults(d); setIcp(d); })
      .catch((e) => setError(e.message));
  }, []);

  async function run() {
    setLoading(true);
    setError('');
    try {
      setResult(await scoreLeads({ leads: file.rows, icp, checkMx }));
      setRunCount((n) => n + 1);
      refreshRuns();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openRun(id) {
    setLoading(true);
    setError('');
    try {
      const saved = await getRun(id);
      setResult({ summary: saved.summary, leads: saved.leads });
      setRunCount((n) => n + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function download(leads) {
    setExporting(true);
    setError('');
    try {
      const blob = await exportCsv(leads);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scored_leads.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <i /><i /><i />
            </span>
            <div>
              <h1>Acquisition-Fit Lead Scorer</h1>
              <p>Rank small-business leads by how well they fit what you want to buy.</p>
            </div>
          </div>
          <div className="header-right">
            <span className="header-tag">Built for the Caprae Capital pre-work</span>
            <img
              className="partner-logo"
              src={`${import.meta.env.BASE_URL}caprae-logo.png`}
              alt="Caprae Capital"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        </div>
      </header>

      <div className="page">
        {error && <div className="banner" role="alert">{error}</div>}

        <div className="layout">
          <aside className="side">
            <UploadCard info={file} onLoaded={(f) => { setFile(f); setResult(null); }} />
            {icp && (
              <IcpForm
                key={formKey}
                icp={icp}
                onChange={setIcp}
                onReset={() => { setIcp(defaults); setFormKey((k) => k + 1); }}
              />
            )}
            <section className="card">
              <h2><span className="step">3</span> Score them</h2>
              <label className="check">
                <input type="checkbox" checked={checkMx} onChange={(e) => setCheckMx(e.target.checked)} />
                Also check that email domains can receive mail (slower)
              </label>
              <button type="button" className="btn primary block" disabled={!file || !icp || loading} onClick={run}>
                {loading ? 'Scoring…' : 'Score leads'}
              </button>
              {!file && <p className="hint">Load a file first.</p>}
            </section>
            <RecentRuns runs={runs} onOpen={openRun} disabled={loading} />
          </aside>

          <main className="main">
            {loading ? (
              <ResultsSkeleton />
            ) : result ? (
              <>
                <Summary summary={result.summary} />
                <ResultsTable key={runCount} leads={result.leads} onExport={download} exporting={exporting} />
              </>
            ) : (
              <section className="card empty-state">
                <h2>How it works</h2>
                <ol>
                  <li><b>Clean:</b> duplicates are merged and bad emails are flagged.</li>
                  <li><b>Score:</b> each business is rated 0-100 for acquisition fit: industry, size, revenue, track record,
                    owner age (a succession signal), reputation, and how reachable the owner is.</li>
                  <li><b>Explain:</b> every score comes with reasons, so you can trust it or change the profile.</li>
                  <li><b>Export:</b> download the ranked list as a CSV, best leads first.</li>
                </ol>
                <p className="hint">New here? Click <b>Use sample data</b> to try it with made-up businesses.</p>
              </section>
            )}
          </main>
        </div>

        <footer className="foot-note">
          Scores are a prioritisation aid built from the data you provide, not a valuation or a guarantee that a business is for sale.
        </footer>
      </div>
    </>
  );
}
