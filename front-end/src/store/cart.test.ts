import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { cartReducer, clearCart, decimalToCents, removeProduct, setProductQuantity } from './cart';

const product: Product = { id: 1, name: 'Produto', price: '7.50', imagePath: '/product.jpg' };

describe('cart', () => {
  it('converte decimal para centavos', () => {
    expect(decimalToCents('7.50')).toBe(750);
    expect(decimalToCents('2.2')).toBe(220);
  });

  it('adiciona, atualiza e limita quantidade', () => {
    let state = cartReducer(undefined, setProductQuantity({ product, quantity: 2 }));
    expect(state.items[0]).toMatchObject({ productId: 1, quantity: 2, unitPriceCents: 750 });
    state = cartReducer(state, setProductQuantity({ product, quantity: 120 }));
    expect(state.items[0]?.quantity).toBe(99);
  });

  it('remove quantidade zero, remove item e limpa carrinho', () => {
    let state = cartReducer(undefined, setProductQuantity({ product, quantity: 2 }));
    state = cartReducer(state, setProductQuantity({ product, quantity: 0 }));
    expect(state.items).toEqual([]);
    state = cartReducer(state, setProductQuantity({ product, quantity: 1 }));
    expect(cartReducer(state, removeProduct(1)).items).toEqual([]);
    expect(cartReducer(state, clearCart()).items).toEqual([]);
  });
});
