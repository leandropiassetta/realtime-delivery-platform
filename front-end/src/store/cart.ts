import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../types';

export type CartItem = {
  productId: number;
  name: string;
  imagePath: string;
  unitPriceCents: number;
  quantity: number;
};

type CartState = { items: CartItem[] };
const initialState: CartState = { items: [] };

export function decimalToCents(value: string): number {
  const [whole = '0', decimal = '0'] = value.split('.');
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0').slice(0, 2));
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setProductQuantity: (state, action: PayloadAction<{ product: Product; quantity: number }>) => {
      const quantity = Math.max(0, Math.min(99, Math.trunc(action.payload.quantity || 0)));
      const existing = state.items.find((item) => item.productId === action.payload.product.id);
      if (quantity === 0) {
        state.items = state.items.filter((item) => item.productId !== action.payload.product.id);
      } else if (existing) {
        existing.quantity = quantity;
      } else {
        state.items.push({
          productId: action.payload.product.id,
          name: action.payload.product.name,
          imagePath: action.payload.product.imagePath,
          unitPriceCents: decimalToCents(action.payload.product.price),
          quantity,
        });
      }
    },
    removeProduct: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((item) => item.productId !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
    },
  },
});

export const { setProductQuantity, removeProduct, clearCart } = cartSlice.actions;
export const cartReducer = cartSlice.reducer;
