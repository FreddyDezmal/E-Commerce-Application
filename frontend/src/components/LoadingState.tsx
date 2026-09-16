export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state-block state-block--loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
