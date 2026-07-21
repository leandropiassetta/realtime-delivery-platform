import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { errorMessage } from '../api/client';
import { usersApi } from '../api/resources';
import { PageError, PageLoading } from '../components/feedback';
import { formatDate, roleLabel } from '../lib/format';

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.').max(100),
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'Use pelo menos 8 caracteres.').max(128),
  role: z.enum(['customer', 'seller']),
});
type FormData = z.infer<typeof schema>;

export function AdminPage() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: 'customer' } });
  const create = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      reset();
      setFeedback({ type: 'success', message: 'Usuário criado com sucesso.' });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (reason) => setFeedback({ type: 'error', message: errorMessage(reason) }),
  });
  const deactivate = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Acesso desativado e sessões revogadas.' });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (reason) => setFeedback({ type: 'error', message: errorMessage(reason) }),
  });
  const submit = handleSubmit((data) => {
    setFeedback(null);
    create.mutate(data);
  });

  return (
    <div>
      <header className="page-header">
        <div>
          <span className="eyebrow">Administração</span>
          <h1>Gerenciar usuários</h1>
        </div>
        <p>Crie clientes e vendedores ou revogue acessos.</p>
      </header>
      {feedback && (
        <div className={`alert alert-${feedback.type}`} role="status">
          {feedback.message}
        </div>
      )}
      <div className="admin-grid">
        <section className="panel">
          <h2>Novo usuário</h2>
          <form onSubmit={(event) => void submit(event)} noValidate>
            <label htmlFor="name">Nome</label>
            <input id="name" {...register('name')} />
            {errors.name && <span className="field-error">{errors.name.message}</span>}
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" {...register('email')} />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
            <label htmlFor="password">Senha inicial</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
            <label htmlFor="role">Papel</label>
            <select id="role" {...register('role')}>
              <option value="customer">Cliente</option>
              <option value="seller">Vendedor</option>
            </select>
            <button
              className="button button-primary button-block"
              type="submit"
              disabled={create.isPending}
            >
              {create.isPending ? 'Criando…' : 'Criar usuário'}
            </button>
          </form>
        </section>
        <section className="panel admin-list">
          <h2>Usuários cadastrados</h2>
          {users.isPending && <PageLoading />}
          {users.isError && <PageError message="Não foi possível carregar os usuários." />}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Papel</th>
                  <th>Estado</th>
                  <th>Cadastro</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.data?.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </td>
                    <td>{roleLabel[user.role]}</td>
                    <td>
                      <span className={`access-state ${user.active ? 'active' : 'inactive'}`}>
                        {user.active ? 'Ativo' : 'Desativado'}
                      </span>
                    </td>
                    <td>{user.createdAt ? formatDate(user.createdAt) : '—'}</td>
                    <td>
                      {user.role !== 'administrator' && user.active && (
                        <button
                          className="text-button danger"
                          type="button"
                          disabled={deactivate.isPending}
                          onClick={() => {
                            if (window.confirm(`Desativar o acesso de ${user.name}?`))
                              deactivate.mutate(user.id);
                          }}
                        >
                          Desativar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
