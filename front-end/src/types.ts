export type Role = 'customer' | 'seller' | 'administrator';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED';

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  deactivatedAt?: string | null;
  createdAt?: string;
};

export type Product = {
  id: number;
  name: string;
  price: string;
  imagePath: string;
};

export type OrderItem = {
  productId: number;
  name: string;
  imagePath: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
};

export type Order = {
  id: number;
  customer: Pick<User, 'id' | 'name'>;
  seller: Pick<User, 'id' | 'name'>;
  totalPrice: string;
  deliveryAddress: string;
  deliveryNumber: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type SessionData = { user: User; accessToken: string };
export type ApiResponse<T> = { data: T; meta?: { count: number } };
