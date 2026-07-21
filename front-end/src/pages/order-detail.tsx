import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { ordersApi } from '../api/resources';
import { useAuth } from '../auth/auth-context';
import { PageError, PageLoading } from '../components/feedback';
import { StatusBadge } from '../components/status-badge';
import { formatDate, formatDecimalMoney, statusLabel } from '../lib/format';
import { useOrderRealtime } from '../realtime/use-order-realtime';
import type { OrderStatus } from '../types';

export function OrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState('');
  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId),
    enabled: Number.isInteger(orderId) && orderId > 0,
  });
  useOrderRealtime(orderId);
  const update = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(orderId, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', orderId], updated);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (reason) => setMutationError(errorMessage(reason)),
  });

  if (order.isPending) return <PageLoading message="Carregando pedido…" />;
  if (order.isError || !order.data)
    return <PageError message="Pedido não encontrado ou sem acesso." />;

  const next: { status: OrderStatus; label: string } | null =
    user?.role === 'seller' && order.data.status === 'PENDING'
      ? { status: 'PREPARING', label: 'Iniciar preparo' }
      : user?.role === 'seller' && order.data.status === 'PREPARING'
        ? { status: 'IN_TRANSIT', label: 'Enviar para entrega' }
        : user?.role === 'customer' && order.data.status === 'IN_TRANSIT'
          ? { status: 'DELIVERED', label: 'Confirmar recebimento' }
          : null;

  return (
    <div>
      <header className="page-header">
        <div>
          <span className="eyebrow">Detalhes</span>
          <h1>Pedido #{String(order.data.id).padStart(4, '0')}</h1>
        </div>
        <Link to={`/${user?.role}/orders`}>Voltar aos pedidos</Link>
      </header>
      {mutationError && <PageError message={mutationError} />}
      <section className="panel order-summary">
        <div>
          <small>Status</small>
          <StatusBadge status={order.data.status} />
        </div>
        <div>
          <small>Realizado em</small>
          <strong>{formatDate(order.data.createdAt)}</strong>
        </div>
        <div>
          <small>{user?.role === 'seller' ? 'Cliente' : 'Vendedor'}</small>
          <strong>
            {user?.role === 'seller' ? order.data.customer.name : order.data.seller.name}
          </strong>
        </div>
        <div>
          <small>Entrega</small>
          <strong>
            {order.data.deliveryAddress}, {order.data.deliveryNumber}
          </strong>
        </div>
      </section>
      <section className="panel">
        <h2>Itens</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Unitário</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.data.items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatDecimalMoney(item.unitPrice)}</td>
                  <td>{formatDecimalMoney(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="order-total">
          <span>Total confirmado</span>
          <strong>{formatDecimalMoney(order.data.totalPrice)}</strong>
        </div>
      </section>
      <section className="status-action panel">
        <div>
          <h2>Próxima etapa</h2>
          <p>
            {next
              ? `O pedido passará para “${statusLabel[next.status]}”.`
              : 'Nenhuma ação está disponível para o seu perfil neste momento.'}
          </p>
        </div>
        {next && (
          <button
            className="button button-primary"
            type="button"
            disabled={update.isPending}
            onClick={() => {
              setMutationError('');
              update.mutate(next.status);
            }}
          >
            {update.isPending ? 'Atualizando…' : next.label}
          </button>
        )}
      </section>
    </div>
  );
}
