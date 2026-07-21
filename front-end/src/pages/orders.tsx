import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersApi } from '../api/resources';
import { useAuth } from '../auth/auth-context';
import { EmptyState, PageError, PageLoading } from '../components/feedback';
import { StatusBadge } from '../components/status-badge';
import { formatDate, formatDecimalMoney } from '../lib/format';
import { useOrderRealtime } from '../realtime/use-order-realtime';

export function OrdersPage() {
  const { user } = useAuth();
  const orders = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list });
  useOrderRealtime();

  return (
    <div>
      <header className="page-header">
        <div>
          <span className="eyebrow">Acompanhamento</span>
          <h1>{user?.role === 'seller' ? 'Pedidos recebidos' : 'Meus pedidos'}</h1>
        </div>
        <p>As mudanças de status aparecem automaticamente.</p>
      </header>
      {orders.isPending && <PageLoading />}
      {orders.isError && <PageError message="Não foi possível carregar os pedidos." />}
      {orders.data?.length === 0 && (
        <EmptyState
          title="Nenhum pedido ainda"
          description={
            user?.role === 'customer'
              ? 'Seu primeiro pedido aparecerá aqui.'
              : 'Novos pedidos atribuídos a você aparecerão aqui.'
          }
        />
      )}
      <section className="order-grid" aria-label="Pedidos">
        {orders.data?.map((order) => (
          <Link className="order-card" key={order.id} to={`/${user?.role}/orders/${order.id}`}>
            <div className="order-card-top">
              <span>Pedido #{String(order.id).padStart(4, '0')}</span>
              <StatusBadge status={order.status} />
            </div>
            <strong>{formatDecimalMoney(order.totalPrice)}</strong>
            <p>{user?.role === 'seller' ? order.customer.name : order.seller.name}</p>
            <small>
              {order.deliveryAddress}, {order.deliveryNumber}
            </small>
            <time dateTime={order.createdAt}>{formatDate(order.createdAt)}</time>
          </Link>
        ))}
      </section>
    </div>
  );
}
