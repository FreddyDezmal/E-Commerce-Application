export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="state-block state-block--empty">
      <p className="state-block__title">{title}</p>
      {hint && <p className="state-block__hint">{hint}</p>}
    </div>
  );
}
