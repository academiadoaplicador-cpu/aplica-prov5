import { Navigate, Outlet } from 'react-router-dom';
import { User } from '../types';
import { ROUTES } from './paths';

/** Para onde cada papel é levado quando cai numa área que não é a dele. */
export function homeRouteFor(user: User): string {
  if (user.role === 'client') return ROUTES.client.home;
  if (user.role === 'supplier') return ROUTES.supplier.home;
  return ROUTES.dashboard;
}

/** Área da oficina — cliente e fornecedor são devolvidos para a área deles. */
export function ProtectedRoute({ user }: { user: User | null }) {
  if (!user) {
    return <Navigate to={ROUTES.login} replace />;
  }
  if (user.role !== 'applicator') {
    return <Navigate to={homeRouteFor(user)} replace />;
  }
  return <Outlet context={{ user }} />;
}

/** Área do fornecedor: só a conta de fornecedor entra. */
export function SupplierRoute({ user }: { user: User | null }) {
  if (!user) {
    return <Navigate to={ROUTES.login} replace />;
  }
  if (user.role !== 'supplier') {
    return <Navigate to={homeRouteFor(user)} replace />;
  }
  return <Outlet context={{ user }} />;
}

export function AdminRoute({ user }: { user: User }) {
  if (!user.isAdmin) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return <Outlet />;
}

export function GuestRoute({ user }: { user: User | null }) {
  if (user) {
    return <Navigate to={homeRouteFor(user)} replace />;
  }
  return <Outlet />;
}

/** Área do cliente final. */
export function ClientRoute({ user }: { user: User | null }) {
  if (!user) {
    return <Navigate to={ROUTES.client.login} replace />;
  }
  if (user.role !== 'client') {
    return <Navigate to={homeRouteFor(user)} replace />;
  }
  return <Outlet context={{ user }} />;
}

/** Login/cadastro do cliente: quem já tem sessão vai direto para sua área. */
export function ClientGuestRoute({ user }: { user: User | null }) {
  if (user) {
    return <Navigate to={homeRouteFor(user)} replace />;
  }
  return <Outlet />;
}
