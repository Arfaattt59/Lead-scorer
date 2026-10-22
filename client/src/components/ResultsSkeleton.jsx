// Placeholder shaped like the results while the server is scoring.
export default function ResultsSkeleton() {
  return (
    <div aria-busy="true" role="status" aria-label="Scoring leads">
      <div className="stats">
        {Array.from({ length: 6 }, (_, i) => <div className="skeleton skeleton-stat" key={i} />)}
      </div>
      <section className="card">
        {Array.from({ length: 8 }, (_, i) => <div className="skeleton skeleton-row" key={i} />)}
      </section>
    </div>
  );
}
