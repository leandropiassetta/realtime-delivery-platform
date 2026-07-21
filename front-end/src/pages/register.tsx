import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/auth-context';
import { roleHome } from '../lib/format';

const schema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(100),
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'Use pelo menos 8 caracteres.').max(128),
});
type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { user, register: createAccount, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!loading && user) return <Navigate to={roleHome(user.role)} replace />;
  const submit = handleSubmit(async (data) => {
    setError('');
    try {
      await createAccount(data);
      navigate('/customer/products', { replace: true });
    } catch (reason) {
      setError(errorMessage(reason));
    }
  });

  return (
    <main className="auth-page auth-page-register">
      <section className="auth-copy">
        <span className="eyebrow">Cadastro protegido</span>
        <h1>Comece seu próximo pedido.</h1>
        <p>
          Novos cadastros recebem sempre o perfil de cliente. Outros papéis são gerenciados por
          administradores.
        </p>
      </section>
      <section className="auth-card" aria-labelledby="register-title">
        <h2 id="register-title">Crie sua conta</h2>
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={(event) => void submit(event)} noValidate>
          <label htmlFor="name">Nome</label>
          <input
            id="name"
            autoComplete="name"
            {...register('name')}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <span className="field-error">{errors.name.message}</span>}
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
            autoComplete="new-password"
            {...register('password')}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <span className="field-error">{errors.password.message}</span>}
          <button
            className="button button-primary button-block"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Criando conta…' : 'Cadastrar'}
          </button>
        </form>
        <p className="auth-link">
          Já possui conta? <Link to="/login">Voltar ao login</Link>
        </p>
      </section>
    </main>
  );
}
