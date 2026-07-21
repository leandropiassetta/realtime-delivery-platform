import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { productsApi } from '../api/resources';
import { EmptyState, PageError, PageLoading } from '../components/feedback';
import { formatDecimalMoney, formatMoney } from '../lib/format';
import { useAppDispatch, useAppSelector, selectCartTotal } from '../store/index';
import { setProductQuantity } from '../store/cart';
import type { Product } from '../types';

function ProductCard({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
  const quantity = useAppSelector(
    (state) => state.cart.items.find((item) => item.productId === product.id)?.quantity ?? 0,
  );
  const update = (next: number) => dispatch(setProductQuantity({ product, quantity: next }));

  return (
    <article className="product-card">
      <div className="product-image">
        <img src={product.imagePath} alt={product.name} />
      </div>
      <div className="product-content">
        <span className="product-price">{formatDecimalMoney(product.price)}</span>
        <h2>{product.name}</h2>
        <div className="quantity-control" aria-label={`Quantidade de ${product.name}`}>
          <button
            type="button"
            aria-label={`Remover uma unidade de ${product.name}`}
            onClick={() => update(quantity - 1)}
            disabled={quantity === 0}
          >
            −
          </button>
          <input
            type="number"
            min="0"
            max="99"
            value={quantity}
            aria-label={`Quantidade de ${product.name}`}
            onChange={(event) => update(Number(event.target.value))}
          />
          <button
            type="button"
            aria-label={`Adicionar uma unidade de ${product.name}`}
            onClick={() => update(quantity + 1)}
            disabled={quantity === 99}
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductsPage() {
  const products = useQuery({ queryKey: ['products'], queryFn: productsApi.list });
  const total = useAppSelector(selectCartTotal);
  const itemCount = useAppSelector((state) =>
    state.cart.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  return (
    <div>
      <header className="page-header">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1>Escolha seus produtos</h1>
        </div>
        <p>Monte o carrinho e acompanhe cada etapa do pedido em tempo real.</p>
      </header>
      {products.isPending && <PageLoading message="Carregando catálogo…" />}
      {products.isError && <PageError message="Não foi possível carregar os produtos." />}
      {products.data?.length === 0 && (
        <EmptyState title="Catálogo vazio" description="Nenhum produto está disponível agora." />
      )}
      <section className="product-grid" aria-label="Produtos disponíveis">
        {products.data?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
      <aside className={`cart-dock ${total === 0 ? 'cart-dock-empty' : ''}`} aria-live="polite">
        <span>
          <strong>{itemCount}</strong> {itemCount === 1 ? 'item' : 'itens'} no carrinho
        </span>
        <strong>{formatMoney(total)}</strong>
        {total > 0 ? (
          <Link className="button button-accent" to="/customer/checkout">
            Revisar pedido
          </Link>
        ) : (
          <span>Adicione um produto</span>
        )}
      </aside>
    </div>
  );
}
