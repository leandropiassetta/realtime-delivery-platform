import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/auth-context';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/protected-route';
import { roleHome } from './lib/format';
import { AdminPage } from './pages/admin';
import { CheckoutPage } from './pages/checkout';
import { ForbiddenPage, NotFoundPage } from './pages/errors';
import { LoginPage } from './pages/login';
import { OrderDetailPage } from './pages/order-detail';
import { OrdersPage } from './pages/orders';
import { ProductsPage } from './pages/products';
import { RegisterPage } from './pages/register';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-state">Restaurando sessão…</div>;
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route element={<ProtectedRoute roles={['customer']} />}>
        <Route element={<Layout />}>
          <Route path="/customer/products" element={<ProductsPage />} />
          <Route path="/customer/checkout" element={<CheckoutPage />} />
          <Route path="/customer/orders" element={<OrdersPage />} />
          <Route path="/customer/orders/:id" element={<OrderDetailPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['seller']} />}>
        <Route element={<Layout />}>
          <Route path="/seller/orders" element={<OrdersPage />} />
          <Route path="/seller/orders/:id" element={<OrderDetailPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={['administrator']} />}>
        <Route element={<Layout />}>
          <Route path="/admin/manage" element={<AdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
