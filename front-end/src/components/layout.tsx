import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/auth-context';
import { clearCart } from '../store/cart';
import { useAppDispatch } from '../store/index';
import { roleLabel } from '../lib/format';

export function Layout() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  if (!user) return null;

  const signOut = async () => {
    await logout();
    dispatch(clearCart());
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            RD
          </span>
          <span>Realtime Delivery</span>
        </NavLink>
        <nav aria-label="Navegação principal" className="main-nav">
          {user.role === 'customer' && <NavLink to="/customer/products">Produtos</NavLink>}
          {user.role !== 'administrator' && <NavLink to={`/${user.role}/orders`}>Pedidos</NavLink>}
          {user.role === 'administrator' && <NavLink to="/admin/manage">Usuários</NavLink>}
        </nav>
        <div className="user-menu">
          <span>
            <strong>{user.name}</strong>
            <small>{roleLabel[user.role]}</small>
          </span>
          <button className="button button-ghost" type="button" onClick={() => void signOut()}>
            Sair
          </button>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
