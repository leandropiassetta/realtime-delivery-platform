import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { errorMessage } from '../api/client';
import { ordersApi, usersApi } from '../api/resources';
import { EmptyState, PageError, PageLoading } from '../components/feedback';
import { formatMoney } from '../lib/format';
import { selectCartTotal, useAppDispatch, useAppSelector } from '../store/index';
import { clearCart, removeProduct } from '../store/cart';

const schema = z.object({
  sellerId: z.string().min(1, 'Selecione um vendedor.'),
  deliveryAddress: z.string().trim().min(3, 'Informe um endereço válido.').max(150),
  deliveryNumber: z.string().trim().min(1, 'Informe o número.').max(30),
});
type FormData = z.infer<typeof schema>;

export function CheckoutPage() {
  const items = useAppSelector((state) => state.cart.items);
  const total = useAppSelector(selectCartTotal);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');
  const sellers = useQuery({ queryKey: ['sellers'], queryFn: usersApi.sellers });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const createOrder = useMutation({
    mutationFn: (data: FormData) =>
      ordersApi.create(
        {
          sellerId: Number(data.sellerId),
          deliveryAddress: data.deliveryAddress,
          deliveryNumber: data.deliveryNumber,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        },
        crypto.randomUUID(),
      ),
    onSuccess: (order) => {
      dispatch(clearCart());
      navigate(`/customer/orders/${order.id}`);
    },
    onError: (reason) => setSubmitError(errorMessage(reason)),
  });

  if (items.length === 0) {
    return (
      <EmptyState
        title="Seu carrinho está vazio"
        description="Adicione produtos antes de finalizar."
      />
    );
  }
  const submit = handleSubmit((data) => {
    setSubmitError('');
    createOrder.mutate(data);
  });

  return (
    <div>
      <header className="page-header">
        <div>
          <span className="eyebrow">Checkout</span>
          <h1>Revise e finalize</h1>
        </div>
        <Link to="/customer/products">Continuar comprando</Link>
      </header>
      <div className="checkout-grid">
        <section className="panel">
          <h2>Itens do pedido</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd.</th>
                  <th>Unitário</th>
                  <th>Subtotal</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.unitPriceCents)}</td>
                    <td>{formatMoney(item.unitPriceCents * item.quantity)}</td>
                    <td>
                      <button
                        className="text-button danger"
                        type="button"
                        onClick={() => dispatch(removeProduct(item.productId))}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="order-total">
            <span>Total estimado</span>
            <strong>{formatMoney(total)}</strong>
            <small>O valor definitivo será recalculado no servidor.</small>
          </div>
        </section>
        <section className="panel">
          <h2>Entrega</h2>
          {sellers.isPending && <PageLoading message="Carregando vendedores…" />}
          {sellers.isError && <PageError message="Não foi possível carregar os vendedores." />}
          {submitError && <PageError message={submitError} />}
          <form onSubmit={(event) => void submit(event)} noValidate>
            <label htmlFor="sellerId">Vendedor</label>
            <select id="sellerId" {...register('sellerId')} defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {sellers.data?.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </select>
            {errors.sellerId && <span className="field-error">{errors.sellerId.message}</span>}
            <label htmlFor="deliveryAddress">Endereço</label>
            <input
              id="deliveryAddress"
              autoComplete="street-address"
              {...register('deliveryAddress')}
            />
            {errors.deliveryAddress && (
              <span className="field-error">{errors.deliveryAddress.message}</span>
            )}
            <label htmlFor="deliveryNumber">Número</label>
            <input
              id="deliveryNumber"
              autoComplete="address-line2"
              {...register('deliveryNumber')}
            />
            {errors.deliveryNumber && (
              <span className="field-error">{errors.deliveryNumber.message}</span>
            )}
            <button
              className="button button-primary button-block"
              type="submit"
              disabled={createOrder.isPending || !sellers.data?.length}
            >
              {createOrder.isPending ? 'Finalizando…' : 'Finalizar pedido'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
