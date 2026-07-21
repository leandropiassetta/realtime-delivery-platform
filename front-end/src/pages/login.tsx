import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/auth-context';
import { roleHome } from '../lib/format';

const schema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
});
type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (!loading && user) return <Navigate to={roleHome(user.role)} replace />;

  const submit = handleSubmit(async (data) => {
    setError('');
    try {
      const loggedUser = await login(data);
      const requested = (location.state as { from?: string } | null)?.from;
      navigate(requested ?? roleHome(loggedUser.role), { replace: true });
    } catch (reason) {
      setError(errorMessage(reason));
    }
  });

  return (
    <main className="auth-page">
      <section className="auth-copy">
        <span className="eyebrow">Pedidos conectados</span>
        <h1>Delivery acompanhado em tempo real.</h1>
        <p>Clientes, vendedores e administradores em uma experiência segura e objetiva.</p>
      </section>
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand brand-dark">
          <span className="brand-mark">RD</span> Realtime Delivery
        </div>
        <h2 id="login-title">Acesse sua conta</h2>
        <p className="muted">Use as credenciais locais documentadas no README.</p>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={(event) => void submit(event)} noValidate>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <span className="field-error">{errors.email.message}</span>}
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <span className="field-error">{errors.password.message}</span>}
          <button
            className="button button-primary button-block"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="auth-link">
          Ainda não tem uma conta? <Link to="/register">Cadastre-se</Link>
        </p>
      </section>
    </main>
  );
}
