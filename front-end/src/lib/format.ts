import type { OrderStatus, Role } from '../types';

export const formatMoney = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export const formatDecimalMoney = (value: string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

export const statusLabel: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  PREPARING: 'Preparando',
  IN_TRANSIT: 'Em trânsito',
  DELIVERED: 'Entregue',
};

export const roleLabel: Record<Role, string> = {
  customer: 'Cliente',
  seller: 'Vendedor',
  administrator: 'Administrador',
};

export const roleHome = (role: Role) => {
  if (role === 'administrator') return '/admin/manage';
  if (role === 'seller') return '/seller/orders';
  return '/customer/products';
};
