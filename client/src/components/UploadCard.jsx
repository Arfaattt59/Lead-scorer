import { useRef, useState } from 'react';
import { parseCsv, looksLikeLeads, MAX_ROWS } from '../csv.js';

export default function UploadCard({ info, onLoaded }) {
  const [error, setError] = useState('');
  const input = useRef(null);

  function accept(text, name) {
    const { columns, rows } = parseCsv(text);
    if (rows.length === 0) {
      setError('That file has no data rows. Check that the first row contains column names.');
      return;
    }
    if (!looksLikeLeads(columns)) {
      setError('This does not look like a list of businesses. It needs a column for the business name or website.');
      return;
    }
    if (rows.length > MAX_ROWS) {
      setError(`That file has ${rows.length} rows. The limit is ${MAX_ROWS}. Split it and upload a part.`);
      return;
    }
    setError('');
    onLoaded({ rows, columns, name });
  }

  async function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      accept(await file.text(), file.name);
    } catch {
      setError('Could not read that file.');
    }
    event.target.value = '';
  }

  async function useSample() {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}sample_leads.csv`);
      if (!res.ok) throw new Error();
      accept(await res.text(), 'sample_leads.csv (synthetic demo data)');
    } catch {
      setError('Could not load the sample file.');
    }
  }

  return (
    <section className="card" id="step-load">
      <h2><span className="step">1</span> Load your leads</h2>
      <p className="hint">
        Upload a CSV with one business per row. Common column names are recognised automatically
        (name, industry, city, website, email, employees, revenue, owner age...).
      </p>
      <div className="row">
        <button type="button" className="btn primary" onClick={() => input.current?.click()}>
          Choose CSV file
        </button>
        <button type="button" className="btn" onClick={useSample}>Use sample data</button>
        <input ref={input} type="file" accept=".csv,text/csv" onChange={onFile} hidden />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {info && (
        <div className="loaded">
          <strong>{info.rows.length} rows</strong> loaded from {info.name}
          <div className="chips" aria-label="Detected columns">
            {info.columns.filter(Boolean).slice(0, 14).map((c) => <span className="chip" key={c}>{c}</span>)}
          </div>
        </div>
      )}
    </section>
  );
}
