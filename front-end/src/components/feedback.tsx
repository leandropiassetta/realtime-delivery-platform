export function PageLoading({ message = 'Carregando…' }: { message?: string }) {
  return (
    <div className="page-state" role="status">
      <span className="spinner" />
      {message}
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="alert alert-error" role="alert">
      {message}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
