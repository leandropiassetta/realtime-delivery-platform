import type { ApiResponse, Order, OrderStatus, Product, Role, SessionData, User } from '../types';
import { api } from './client';

export const authApi = {
  login: (body: { email: string; password: string }) =>
    api.post<ApiResponse<SessionData>>('/auth/login', body).then((response) => response.data.data),
  register: (body: { name: string; email: string; password: string }) =>
    api
      .post<ApiResponse<SessionData>>('/auth/register', body)
      .then((response) => response.data.data),
  logout: () => api.post('/auth/logout'),
};

export const productsApi = {
  list: () => api.get<ApiResponse<Product[]>>('/products').then((response) => response.data.data),
};

export const usersApi = {
  sellers: () =>
    api
      .get<ApiResponse<Array<Pick<User, 'id' | 'name'>>>>('/users/sellers')
      .then((response) => response.data.data),
  list: () => api.get<ApiResponse<User[]>>('/users').then((response) => response.data.data),
  create: (body: {
    name: string;
    email: string;
    password: string;
    role: Exclude<Role, 'administrator'>;
  }) => api.post<ApiResponse<User>>('/users', body).then((response) => response.data.data),
  deactivate: (id: number) => api.delete(`/users/${id}`),
};

export const ordersApi = {
  list: () => api.get<ApiResponse<Order[]>>('/orders').then((response) => response.data.data),
  get: (id: number) =>
    api.get<ApiResponse<Order>>(`/orders/${id}`).then((response) => response.data.data),
  create: (
    body: {
      sellerId: number;
      deliveryAddress: string;
      deliveryNumber: string;
      items: Array<{ productId: number; quantity: number }>;
    },
    idempotencyKey: string,
  ) =>
    api
      .post<ApiResponse<Order>>('/orders', body, { headers: { 'Idempotency-Key': idempotencyKey } })
      .then((response) => response.data.data),
  updateStatus: (id: number, status: OrderStatus) =>
    api
      .patch<ApiResponse<Order>>(`/orders/${id}/status`, { status })
      .then((response) => response.data.data),
};
