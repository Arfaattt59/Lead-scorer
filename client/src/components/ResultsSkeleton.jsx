// Placeholder shaped like the results while the server is scoring.
export default function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Scoring leads">
      <div className="skeleton skeleton-summary" />
      <section className="card">
        {Array.from({ length: 8 }, (_, i) => <div className="skeleton skeleton-row" key={i} />)}
      </section>
    </div>
  );
}
