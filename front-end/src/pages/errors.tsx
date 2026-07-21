import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <main className="standalone-state">
      <span>403</span>
      <h1>Acesso não permitido</h1>
      <p>Seu perfil não possui permissão para esta página.</p>
      <Link className="button button-primary" to="/">
        Voltar ao início
      </Link>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="standalone-state">
      <span>404</span>
      <h1>Página não encontrada</h1>
      <p>Confira o endereço ou volte para a plataforma.</p>
      <Link className="button button-primary" to="/">
        Voltar ao início
      </Link>
    </main>
  );
}
