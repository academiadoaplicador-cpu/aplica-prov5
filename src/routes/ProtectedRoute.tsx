import { Navigate, Outlet } from 'react-router-dom';
import { User } from '../types';
import { ROUTES } from './paths';

/** Para onde cada papel é levado quando cai numa área que não é a dele. */
export function homeRouteFor(user: User): string {
  return user.role === 'client' ? ROUTES.client.home : ROUTES.dashboard;
}

/** Área da oficina — cliente final é devolvido para a área dele. */
export function ProtectedRoute({ user }: { user: User | null }) {
  if (!user) {
    return <Navigate to={ROUTES.login} replace />;
  }
  if (user.role === 'client') {
    return <Navigate to={ROUTES.client.home} replace />;
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
    return <Navigate to={ROUTES.dashboard} replace />;
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
